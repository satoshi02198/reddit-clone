import { authModalState } from "@/atoms/authModalAtom";
import { communityState } from "@/atoms/communityAtom";
import { auth, firestore, storage } from "@/firebase/clientApp";
import {
  deleteDoc,
  doc,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { Post, postState, PostVote } from "../atoms/postAtom";

const usePosts = () => {
  const [user] = useAuthState(auth);

  const router = useRouter();
  const [postStateValue, setPostStateValue] = useRecoilState(postState);
  const currentCommunity = useRecoilValue(communityState).currentCommunity;
  const setAuthModalState = useSetRecoilState(authModalState);

  const onVote = async (
    event: React.MouseEvent<SVGElement, MouseEvent>,
    post: Post,
    vote: number,
    communityId: string
  ) => {
    event.stopPropagation();
    //?check if user is logged in
    if (!user?.uid) {
      setAuthModalState({ open: true, view: "login" });

      return;
    }

    try {
      //? extract voteStatus
      const { voteStatus } = post;
      //? check if user already vote to the post
      const existingVote = postStateValue.postVotes.find(
        (vote) => vote.postId === post.id
      );

      const batch = writeBatch(firestore);
      //? copy of modifying state to use below depend on an action
      const updatedPost = { ...post };
      const updatedPosts = [...postStateValue.posts];
      let updatedPostVotes = [...postStateValue.postVotes];

      //? to use state depend on an action. number
      let voteChange = vote;

      //? if new vote
      if (!existingVote) {
        console.log("new vote");
        //? create a new postVote document on firestore on 'users'
        const postVoteRef = doc(
          collection(firestore, "users", `${user?.uid}/postVotes`)
        );
        const newVote: PostVote = {
          id: postVoteRef.id,
          postId: post.id,
          communityId,
          voteValue: vote, //? 1 or -1
        };

        batch.set(postVoteRef, newVote);

        //? add/subtract 1 to/from post.voteStatus
        updatedPost.voteStatus = voteStatus + voteChange;
        updatedPostVotes = [...updatedPostVotes, newVote];

        //? in case already voted
      } else {
        console.log("already voted");
        //? if user already voted to the post
        const postVoteRef = doc(
          firestore,
          "users",
          `${user?.uid}/postVotes/${existingVote.id}`
        );

        if (existingVote.voteValue === vote) {
          console.log("up to neutural");
          //? removing their vote (up => neutural or down => neutural)

          //? add/subtract 1 to/from post.voteStatus
          updatedPost.voteStatus = voteStatus - vote;
          updatedPostVotes = updatedPostVotes.filter(
            (vote) => vote.id !== existingVote.id
          );
          //? delete the postVote document on firestore
          batch.delete(postVoteRef);

          voteChange *= -1;
        }

        //? flipping their vote (up => down or down => up)
        else {
          console.log("up to down or down to up");
          //? update the existing postVote document on firestore
          batch.update(postVoteRef, {
            voteValue: vote,
          });
          //? add/subtract 2 to/from post.voteStatus
          updatedPost.voteStatus = voteStatus + 2 * vote;
          //? find index in postVotes in PostState
          const voteIndex = postStateValue.postVotes.findIndex(
            (vote) => vote.id === existingVote.id
          );

          //? use index to update postVotes
          updatedPostVotes[voteIndex] = {
            ...existingVote,
            voteValue: vote,
          };

          voteChange = 2 * vote;
        }
      }

      //? update our post document of 'posts'  on firestore
      const postRef = doc(firestore, "posts", post.id!);
      batch.update(postRef, { voteStatus: voteStatus + voteChange });

      await batch.commit();

      //? update the state it is better to update after commit athewise sometimes
      //? postStateValue doen't update
      const postIdx = postStateValue.posts.findIndex(
        (item) => item.id === post.id
      );
      updatedPosts[postIdx] = updatedPost;
      setPostStateValue((prev) => ({
        ...prev,
        posts: updatedPosts,
        postVotes: updatedPostVotes,
      }));

      if (postStateValue.selectedPost) {
        setPostStateValue((prev) => ({
          ...prev,
          selectedPost: updatedPost,
        }));
      }

      // //? chatGPT suggestions start it is work but too many mount
      // // Fetch updated post and postVotes
      // const postRef2 = doc(firestore, "posts", post.id!);
      // const postDoc = await getDoc(postRef2);
      // const updatedPost2 = { id: postDoc.id, ...postDoc.data() } as Post;

      // const postVotesQuery = query(
      //   collection(firestore, `users/${user?.uid}/postVotes`),
      //   where("postId", "==", post.id)
      // );
      // const postVoteDocs = await getDocs(postVotesQuery);
      // const updatedPostVotes2 = postVoteDocs.docs.map((doc) => ({
      //   id: doc.id,
      //   ...doc.data(),
      // })) as PostVote[];

      // // Update the state
      // const postIdx2 = postStateValue.posts.findIndex(
      //   (item) => item.id === post.id
      // );
      // setPostStateValue((prev) => ({
      //   ...prev,
      //   posts: [
      //     ...prev.posts.slice(0, postIdx2),
      //     updatedPost,
      //     ...prev.posts.slice(postIdx2 + 1),
      //   ],
      //   postVotes: updatedPostVotes2,
      // }));

      // if (postStateValue.selectedPost) {
      //   setPostStateValue((prev) => ({
      //     ...prev,
      //     selectedPost: updatedPost2,
      //   }));
      // }
      //? chatGPT suggestions end

      //? to reflesh postStateValue
      //? but ux is bad
      // router.reload();
    } catch (error) {
      console.log("onVote error", error);
    }
  };

  //? to go individual page
  const onSelectPost = (post: Post) => {
    setPostStateValue((prev) => ({
      ...prev,
      selectedPost: post,
    }));
    router.push(`/r/${post.communityId}/comments/${post.id}`);
  };

  //? to delete post
  const onDeletePost = async (post: Post): Promise<boolean> => {
    try {
      //? check if image, delete image
      if (post.imageURL) {
        const imageRef = ref(storage, `posts/${post.id}/image`);
        await deleteObject(imageRef);
      }

      //? delete post document from firestore
      const postDocRef = doc(firestore, "posts", post.id!);
      await deleteDoc(postDocRef);

      //? update recoil state
      setPostStateValue((prev) => ({
        ...prev,
        posts: prev.posts.filter((item) => item.id !== post.id),
      }));

      return true;
    } catch (error) {
      return false;
    }
  };

  //?  need to prevent vote number keep after refreshing page
  const getCommunityPostVotes = async (communityId: string) => {
    const postVoteQuery = query(
      collection(firestore, "users", `${user?.uid}/postVotes`),
      where("communityId", "==", communityId)
    );

    const postVoteDocs = await getDocs(postVoteQuery);
    const postVotes = postVoteDocs.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setPostStateValue((prev) => ({
      ...prev,
      postVotes: postVotes as PostVote[],
    }));
  };

  useEffect(() => {
    if (!user || !currentCommunity?.id) return;
    getCommunityPostVotes(currentCommunity?.id);
  }, [user, currentCommunity]);

  //? to clear postVotes
  //? as well as postVotes mySnippets should be cleared on useCommunityData hook
  useEffect(() => {
    if (!user) {
      setPostStateValue((prev) => ({
        ...prev,
        postVotes: [],
      }));
    }
  }, [user]);

  return {
    postStateValue,
    setPostStateValue,
    onVote,
    onSelectPost,
    onDeletePost,
  };
};
export default usePosts;
