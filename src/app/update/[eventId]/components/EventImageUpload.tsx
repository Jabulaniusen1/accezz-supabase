import { motion } from "framer-motion";
import Image from "next/image";
import { BiImageAdd } from "react-icons/bi";
import { RiImageEditFill } from "react-icons/ri";

interface EventImageUploadProps {
  imagePreview: string | null | undefined;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function EventImageUpload({
  imagePreview,
  handleImageChange,
}: EventImageUploadProps) {
  return (
    <motion.div
      className="flex justify-center items-center mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="relative group w-full max-w-[540px] h-[200px] sm:h-[250px] rounded-[5px] overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-shadow mx-auto">
        {imagePreview ? (
          <>
            <Image
              src={imagePreview}
              alt="Event preview"
              fill
              className="object-cover transition-all duration-300"
              style={{ borderRadius: "5px" }}
              priority
            />
            <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-[5px]">
              <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-white/90 dark:bg-gray-900/90 rounded-[5px] shadow-lg">
                <RiImageEditFill className="text-xl sm:text-2xl text-[#f54502] mb-1" />
                <span className="text-sm sm:text-base font-medium text-gray-800 dark:text-white">
                  Change Image
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  Click to upload new
                </span>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </>
        ) : (
          <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-[#f54502]/5 dark:bg-gray-800 rounded-[5px]">
            <div className="flex flex-col items-center justify-center p-4 sm:p-6 bg-white/85 dark:bg-gray-900/85 rounded-[5px] shadow border-2 border-dashed border-[#f54502]/30 dark:border-gray-600">
              <BiImageAdd className="text-2xl sm:text-3xl text-[#f54502] mb-2" />
              <span className="text-sm sm:text-base font-medium text-gray-800 dark:text-white">
                Upload Event Image
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                JPG, PNG, or WEBP
              </span>
            </div>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
        )}
      </div>
    </motion.div>
  );
}