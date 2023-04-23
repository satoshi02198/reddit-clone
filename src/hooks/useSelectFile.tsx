import React, { useState } from "react";

const useSelectFile = () => {
  const [selectedFile, setSelectedFile] = useState<string>();

  //? for images & videos
  const onSelectFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    //? read the file
    const reader = new FileReader();
    if (event.target.files?.[0]) {
      reader.readAsDataURL(event.target.files[0]);
    }

    //? set the data
    reader.onload = (readerEvent) => {
      if (readerEvent.target?.result) {
        setSelectedFile(readerEvent.target.result as string);
      }
    };
  };
  return {
    selectedFile,
    setSelectedFile,
    onSelectFile,
  };
};
export default useSelectFile;
