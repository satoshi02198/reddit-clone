import { Alert, AlertIcon, Flex, Icon, Text } from "@chakra-ui/react";
import React, { useState } from "react";
import { BsLink45Deg, BsMic } from "react-icons/bs";
import { BiPoll } from "react-icons/bi";
import { IoDocumentText, IoImageOutline } from "react-icons/io5";
import TabItem from "./TabItem";
import TextInputs from "./PostForm/TextInputs";
import ImageUpload from "./PostForm/ImageUpload";
import { Post } from "@/atoms/postAtom";
import { User } from "firebase/auth";
import { useRouter } from "next/router";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { firestore, storage } from "@/firebase/clientApp";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import useSelectFile from "@/hooks/useSelectFile";

type NewPostFormProps = {
  user: User;
  communityImageURL?: string;
};

const formTabs: TabItems[] = [
  {
    title: "Post",
    icon: IoDocumentText,
  },
  {
    title: "Images & Video",
    icon: IoImageOutline,
  },
  {
    title: "Link",
    icon: BsLink45Deg,
  },
  {
    title: "Poll",
    icon: BiPoll,
  },
  {
    title: "Talk",
    icon: BsMic,
  },
];

export type TabItems = {
  title: string;
  icon: typeof Icon.arguments;
};

const NewPostForm: React.FC<NewPostFormProps> = ({
  user,
  communityImageURL,
}) => {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState(formTabs[0].title);
  const [textInputs, setTextInputs] = useState({
    title: "",
    body: "",
  });
  //? costum hook useSelectFile
  const { selectedFile, setSelectedFile, onSelectFile } = useSelectFile();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  //? for post to firebase
  const handleCreatePost = async () => {
    //? 1.Post 2.image coz potentialy image upload first and create empty post

    setLoading(true);

    try {
      const { communityId } = router.query;
      //? store the post in db
      //? create new post object => type Post
      const postDocRef = await addDoc(collection(firestore, "posts"), {
        // id: `${textInputs.title}`,
        communityId: communityId as string,
        //? use '' because firebase wouldn't like undefined type
        communityImageURL: communityImageURL || "",
        creatorId: user.uid,
        creatorDisplayName: user.email!.split("@")[0],
        title: textInputs.title,
        body: textInputs.body,
        numberOfComments: 0,
        voteStatus: 0,
        createdAt: serverTimestamp() as Timestamp,
      });

      //? check for selectedFile
      if (selectedFile) {
        //? store the file in firebase storage => getDownloadURL( return imageurl)
        //?make a ref to the file
        const imageRef = ref(storage, `posts/${postDocRef.id}/image`);
        await uploadString(imageRef, selectedFile, "data_url");
        const downloadURL = await getDownloadURL(imageRef);

        //? update post doc by adding image url
        await updateDoc(postDocRef, {
          imageURL: downloadURL,
        });
      }

      //? redirect the user to the communityPage using the router
      router.back();
    } catch (error: any) {
      console.log("handleCreatePost error", error.message);
      setError(true);
    }
    setLoading(false);
  };

  //? for text inputs
  const onTextChange = async (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const {
      target: { name, value },
    } = event;
    setTextInputs((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <Flex direction="column" bg="white" borderRadius={4} mt={2}>
      {/* tabs */}
      <Flex width="100%">
        {formTabs.map((item) => (
          <TabItem
            item={item}
            selected={item.title === selectedTab}
            setSelectedTab={setSelectedTab}
            key={item.title}
          />
        ))}
      </Flex>

      {/* Post */}
      {selectedTab === "Post" && (
        <Flex p={4}>
          <TextInputs
            textInputs={textInputs}
            onChange={onTextChange}
            handleCreatePost={handleCreatePost}
            loading={loading}
          />
        </Flex>
      )}

      {/* Images & Video */}
      {selectedTab === "Images & Video" && (
        <ImageUpload
          selectedFile={selectedFile}
          onSelectImage={onSelectFile}
          setSelectedTab={setSelectedTab}
          setSelectedFile={setSelectedFile}
        />
      )}
      {error && (
        <Alert status="error">
          <AlertIcon />
          <Text mr={2}>Error creating post</Text>
        </Alert>
      )}
    </Flex>
  );
};
export default NewPostForm;
