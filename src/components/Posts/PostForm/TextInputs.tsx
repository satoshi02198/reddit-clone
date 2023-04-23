import { Stack, Textarea, Input, Button, Flex } from "@chakra-ui/react";
import React from "react";
import { useRouter } from "next/router";

type TextInputProps = {
  textInputs: {
    title: string;
    body: string;
  };
  onChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  handleCreatePost: () => void;
  loading: boolean;
};

const TextInputs: React.FC<TextInputProps> = ({
  textInputs,
  onChange,
  handleCreatePost,
  loading,
}) => {
  const router = useRouter();
  const { communityId } = router.query;
  return (
    <Stack spacing={3} width="100%">
      <Input
        name="title"
        value={textInputs.title}
        onChange={onChange}
        fontSize="10pt"
        borderRadius={4}
        placeholder="Title"
        _placeholder={{ color: "gray.500" }}
        _focus={{
          outline: "none",
          bg: "white",
          border: "1px solid",
          borderColor: "black",
        }}
      />
      <Textarea
        value={textInputs.body}
        onChange={onChange}
        name="body"
        fontSize="10pt"
        borderRadius={4}
        height="100px"
        placeholder="Text (optional)"
        _placeholder={{ color: "gray.500" }}
        _focus={{
          outline: "none",
          bg: "white",
          border: "1px solid",
          borderColor: "black",
        }}
      />
      <Flex justify="space-between">
        <Button
          variant="outline"
          height="34px"
          padding="0px 30px"
          onClick={() => router.push(`/r/${communityId}/`)}
        >
          back to community
        </Button>
        <Button
          height="34px"
          padding="0px 30px"
          disabled={!textInputs.title}
          isLoading={loading}
          onClick={handleCreatePost}
        >
          Post
        </Button>
      </Flex>
    </Stack>
  );
};
export default TextInputs;
