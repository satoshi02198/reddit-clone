import { firestore } from "@/firebase/clientApp";
import { doc, getDoc } from "firebase/firestore";
import { GetServerSidePropsContext } from "next";
import React, { useEffect } from "react";
import { Community, communityState } from "@/atoms/communityAtom";
import safeJsonStringify from "safe-json-stringify";
import CommunityNotFound from "@/components/Community/CommunityNotFound";
import CreatePostLink from "@/components/Community/CreatePostLink";
import Header from "@/components/Community/Header";
import PageContent from "@/components/Layout/PageContent";
import Posts from "@/components/Posts/Posts";
import { useSetRecoilState } from "recoil";
import About from "@/components/Community/About";

type CommunityPageProps = {
  communityData: Community;
};

const CommunityPage: React.FC<CommunityPageProps> = ({ communityData }) => {
  console.log("🚀 ~ communityData:", communityData);
  const setCommunityStateValue = useSetRecoilState(communityState);

  if (!communityData) {
    return <CommunityNotFound />;
  }

  //? afert rendring, pass the community data to the posts component
  useEffect(() => {
    setCommunityStateValue((prev) => ({
      ...prev,
      currentCommunity: communityData,
    }));
  }, [communityData]);

  console.log(communityData);
  return (
    <>
      <Header communityData={communityData} />
      <PageContent>
        {/* CHILD 1 LHS*/}
        <>
          <CreatePostLink />
          <Posts communityData={communityData} />
        </>
        {/* CHILD 2 RHS*/}
        <>
          <About communityData={communityData} />
        </>
      </PageContent>
    </>
  );
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
  //?GET COMMUNITY DATA AND PASS IT TO CLIENT
  try {
    const communityDocRef = doc(
      firestore,
      "communities",
      context.query.communityId as string
    );

    const communityDoc = await getDoc(communityDocRef);

    return {
      props: {
        communityData: communityDoc.exists()
          ? JSON.parse(
              safeJsonStringify({
                id: communityDoc.id,
                ...communityDoc.data(),
              })
            )
          : "",
      },
    };
  } catch (error) {
    //?COULD ADD CUSTOM ERROR PAGE
    console.log("getServerSideProps error", error);
  }
}

export default CommunityPage;
