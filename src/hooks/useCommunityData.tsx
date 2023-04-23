import { auth, firestore } from "@/firebase/clientApp";
import {
  getDocs,
  collection,
  writeBatch,
  doc,
  increment,
  getDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useSetRecoilState, useRecoilState } from "recoil";
import {
  communityState,
  Community,
  CommunitySnippet,
} from "../atoms/communityAtom";
import { authModalState } from "@/atoms/authModalAtom";
import { useRouter } from "next/router";

const useCommunityData = () => {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [communityStateValue, setCommunityStateValue] =
    useRecoilState(communityState);
  const setAuthModalState = useSetRecoilState(authModalState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onjoinOrLeaveCommunity = (
    communityData: Community,
    isJoined: boolean
  ) => {
    // is the user signed in?
    // if not => open auth modal
    if (!user) {
      //? open modal
      setAuthModalState({ open: true, view: "login" });
      return;
    }

    if (isJoined) {
      leaveCommunity(communityData.id);
      return;
    }
    joinCommunity(communityData);
  };

  const getMySnippets = async () => {
    setLoading(true);
    try {
      //GET USERS SNIPPETS
      const snippetDocs = await getDocs(
        collection(firestore, `users/${user?.uid}/communitySnippets`)
      );

      const snippets = snippetDocs.docs.map((doc) => ({ ...doc.data() }));
      setCommunityStateValue((prev) => ({
        ...prev,
        mySnippets: snippets as CommunitySnippet[], //OR Array<CommunitySnippet>
        snippetsFetched: true,
      }));
    } catch (error: any) {
      console.log("getMySnippets error", error);
      setError(error.message);
    }
    setLoading(false);
  };

  //JOIN A COMMUNITY
  const joinCommunity = async (communityData: Community) => {
    try {
      //BATCH WRITE
      //CREATING A NEW COMMUNITY SNIPPET
      const batch = writeBatch(firestore);
      const newSnippet: CommunitySnippet = {
        communityId: communityData.id,
        imageURL: communityData.imageURL || "",
        isModerator: user?.uid === communityData.creatorId,
      };

      batch.set(
        doc(
          firestore,
          `users/${user?.uid}/communitySnippets`,
          communityData.id
        ),
        newSnippet
      );

      //UPDATING THE NUMBER OF COMMUNITY NUMBER(+1)
      batch.update(doc(firestore, "communities", communityData.id), {
        numberOfMembers: increment(1),
      });

      await batch.commit();
      //UPDATE RECOIL STATE - COMMUNITYSTATE.MYSNIPPETS
      setCommunityStateValue((prev) => ({
        ...prev,
        mySnippets: [...prev.mySnippets, newSnippet],
      }));
    } catch (error: any) {
      console.log("joinCommunity error", error);
      setError(error.message);
    }
    setLoading(false);
  };

  //LEAVE A COMMUNITY
  const leaveCommunity = async (communityId: string) => {
    try {
      const batch = writeBatch(firestore);
      //BATCH WRITE
      //DELETING A NEW COMMUNITY SNIPPET
      batch.delete(
        doc(firestore, `users/${user?.uid}/communitySnippets`, communityId)
      );

      //UPDATING THE NUMBER OF COMMUNITY NUMBER(-1)
      batch.update(doc(firestore, "communities", communityId), {
        numberOfMembers: increment(-1),
      });

      await batch.commit();
      //UPDATE RECOIL STATE - COMMUNITYSTATE.MYSNIPPETS
      setCommunityStateValue((prev) => ({
        ...prev,
        mySnippets: prev.mySnippets.filter(
          (item) => item.communityId !== communityId
        ),
      }));
    } catch (error: any) {
      console.log("leaveCommunity error", error);
      setError(error.message);
    }
    setLoading(false);
  };

  //? to get communityData to set communityStateValue.currentCommunity
  const getCommunityData = async (communityId: string) => {
    try {
      const communityDocRef = doc(firestore, "communities", communityId);
      const communityDoc = await getDoc(communityDocRef);

      setCommunityStateValue((prev) => ({
        ...prev,
        currentCommunity: {
          id: communityDoc.id,
          ...communityDoc.data(),
        } as Community,
      }));
    } catch (error) {
      console.log("getCommunityData error", error);
    }
  };

  //TO PREVENT CALL BEFORE AUTHsTATE COME ADD DEPENDENCIES [USER]
  useEffect(() => {
    if (!user) {
      setCommunityStateValue((prev) => ({
        ...prev,
        mySnippets: [],
        snippetsFetched: false,
      }));
      return;
    }
    getMySnippets();
  }, [user]);

  //? in case user refreshe page in singlepost or directory come from another page no communityPage
  useEffect(() => {
    const { communityId } = router.query;

    if (communityId && !communityStateValue.currentCommunity) {
      getCommunityData(communityId as string);
    }
  }, [router.query, communityStateValue.currentCommunity]);

  return {
    // DATA AND FUNCTIONS
    communityStateValue,
    onjoinOrLeaveCommunity,
    loading,
  };
};

export default useCommunityData;
