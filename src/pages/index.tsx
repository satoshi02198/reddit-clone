import PageContent from "@/components/Layout/PageContent";
import { auth, firestore } from "@/firebase/clientApp";
import type { NextPage } from "next";
import Head from "next/head";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useState } from "react";
import { communityState } from "@/atoms/communityAtom";
import { useRecoilValue } from "recoil";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import usePosts from "@/hooks/usePosts";
import { Post, PostVote } from "@/atoms/postAtom";
import PostLoader from "@/components/Posts/PostLoader";
import { Stack } from "@chakra-ui/react";
import PostItem from "@/components/Posts/PostItem";
import CreatePostLink from "@/components/Community/CreatePostLink";
import Recommendation from "@/components/Community/Recommendation";
import Premium from "@/components/Community/Premium";
import PersonalHome from "@/components/Community/PersonalHome";
import useCommunityData from "@/hooks/useCommunityData";

const Home: NextPage = () => {
  const [user, loadingUser] = useAuthState(auth);
  const [loading, setLoading] = useState(false);

  const {
    postStateValue,
    setPostStateValue,
    onSelectPost,
    onDeletePost,
    onVote,
  } = usePosts();

  const { communityStateValue } = useCommunityData();
  console.log("🚀 ~ communityStateValue:", communityStateValue.mySnippets);

  //? fetch some posts from each community that the user is in
  const buildUserHomeFeed = async () => {
    // console.log("buildUserHomeFeed");
    setLoading(true);
    try {
      if (communityStateValue.mySnippets.length) {
        //? get posts from user's communities

        //? extract community ids from user's snippets to query firestore
        const myCommunityIds = communityStateValue.mySnippets.map(
          (snippet) => snippet.communityId
        );

        const postQuery = query(
          collection(firestore, "posts"),
          //? myCommunityId is array
          where("communityId", "in", myCommunityIds),
          limit(10)
        );

        const postDocs = await getDocs(postQuery);
        const posts = postDocs.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPostStateValue((prev) => ({
          ...prev,
          posts: posts as Post[],
        }));
      } else {
        buildNoUserHomeFeed();
      }
    } catch (error) {
      console.log("buildUserHomeFeed error", error);
    }
    setLoading(false);
  };

  //? for user not loged in
  const buildNoUserHomeFeed = async () => {
    setLoading(true);
    try {
      //? query from popular posts
      const postQuery = query(
        collection(firestore, "posts"),
        orderBy("voteStatus", "desc"),
        limit(10)
      );

      //? get docs and extract data
      const postDocs = await getDocs(postQuery);
      const posts = postDocs.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      //? set posts state in postAtom.ts
      setPostStateValue((prev) => ({
        ...prev,
        posts: posts as Post[],
      }));
    } catch (error) {
      console.log("buildNoUserHomeFeed error:", error);
    }
    setLoading(false);
  };
  //TODO
  // change to getposts function like post.tsx has
  //? get votes
  const getUserPostVotes = async () => {
    try {
      const postIds = postStateValue.posts.map((post) => post.id);

      const postVotesQuery = query(
        collection(firestore, `users/${user?.uid}/postVotes`),
        where("postId", "in", postIds)
      );

      // const unsubscribe = onSnapshot(postVotesQuery, (querySnapshot) => {
      //   const postVotes = querySnapshot.docs.map((postVote) => ({
      //     id: postVote.id,
      //     ...postVote.data(),
      //   }));
      //   setPostStateValue((prev) => ({
      //     ...prev,
      //     postVotes: postVotes as PostVote[],
      //   }));
      // });
      // return () => unsubscribe();
      const postVoteDocs = await getDocs(postVotesQuery);
      const postVotes = postVoteDocs.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setPostStateValue((prev) => ({
        ...prev,
        postVotes: postVotes as PostVote[],
      }));
    } catch (error) {
      console.log("getUserPostVotes error", error);
    }
  };

  //? 1, useEffect in useCommunityData fire to set mySnippets and snippetsFetched
  //?2, then this useEffect will fire to buildUserHomeFeed
  useEffect(() => {
    if (communityStateValue.snippetsFetched) buildUserHomeFeed();
    // console.log("useEffect first");
  }, [communityStateValue.snippetsFetched]);

  useEffect(() => {
    //? needs loadingUser becouse user maybe loged in deleyed
    if (!user && !loadingUser) buildNoUserHomeFeed();
    // console.log("useEffect second");
  }, [user, loadingUser]);

  useEffect(() => {
    if (!user?.uid || !postStateValue.posts.length) return;
    getUserPostVotes();
    // console.log("useEffect third");

    // //? clean up function
    return () => {
      setPostStateValue((prev) => ({
        ...prev,
        postVotes: [],
      }));
    };
  }, [user?.uid, postStateValue.posts]);

  return (
    <>
      <Head>
        <title>Reddit Clone</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/images/redditFace.svg" />
      </Head>
      <PageContent>
        <>
          <CreatePostLink />
          {loading ? (
            <PostLoader />
          ) : (
            <Stack>
              {postStateValue.posts.map((post) => (
                <>
                  <PostItem
                    key={post.id}
                    post={post}
                    onSelectPost={onSelectPost}
                    onDeletePost={onDeletePost}
                    onVote={onVote}
                    userVoteValue={
                      postStateValue.postVotes.find(
                        (vote) => vote.postId === post.id
                      )?.voteValue
                    }
                    userIsCreator={user?.uid === post.creatorId}
                    homePage
                  />
                </>
              ))}
              {/* {renderPosts()} */}
            </Stack>
          )}
        </>
        <Stack spacing={5}>
          <Recommendation />
          <Premium />
          <PersonalHome />
        </Stack>
      </PageContent>
    </>
  );
};

export default Home;
