import { Button, Flex, Image, Text } from "@chakra-ui/react";
import React from "react";
import { useSignInWithGoogle } from "react-firebase-hooks/auth";
import { auth, firestore } from "../../../firebase/clientApp";
import { FIREBASE_ERRORS } from "@/firebase/errors";
import { User } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useEffect } from "react";

const AuthButtons: React.FC = () => {
  const [signInWithGoogle, userCred, loading, error] =
    useSignInWithGoogle(auth);

  //? IN CASE YOU DONT USE GOOGLE CLOUD FUNCTION
  // const createUserDocument = async (user: User) => {
  //   const userDocRef = doc(firestore, "users", user.uid);
  //   await setDoc(userDocRef, JSON.parse(JSON.stringify(user)));
  // };

  // useEffect(() => {
  //   if (userCred) {
  //     createUserDocument(userCred.user);
  //   }
  // }, [userCred]);

  return (
    <Flex direction="column" width="100%" mb={4}>
      <Button
        variant="oauth"
        mb={2}
        isLoading={loading}
        onClick={() => signInWithGoogle()}
      >
        <Image
          src="/images/googlelogo.png"
          height="20px"
          alt="googlelogo"
          mr={4}
        />
        Continue with Google
      </Button>
      <Button variant="oauth">Some athoer</Button>
      {error && (
        <Text textAlign="center" color="red" fontSize="10pt">
          {FIREBASE_ERRORS[error?.message as keyof typeof FIREBASE_ERRORS]}
        </Text>
      )}
    </Flex>
  );
};
export default AuthButtons;
