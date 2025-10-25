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
      <div className="relative group w-[540px] h-[250px] rounded-xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-shadow">
        {imagePreview ? (
          <>
            <Image
              src={imagePreview}
              alt="Event preview"
              fill
              className="object-cover transition-all duration-300"
              style={{ borderRadius: "12px" }}
              priority
            />
            <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl">
              <div className="flex flex-col items-center justify-center p-4 bg-white/90 dark:bg-gray-900/90 rounded-lg shadow-lg">
                <RiImageEditFill className="text-2xl text-purple-600 dark:text-purple-400 mb-1" />
                <span className="text-base font-medium text-gray-800 dark:text-white">
                  Change Image
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  Click to upload new
                </span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </>
        ) : (
          <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-gradient-to-br from-purple-50 to-blue-100 dark:from-gray-800 dark:to-gray-700 rounded-xl">
            <div className="flex flex-col items-center justify-center p-6 bg-white/85 dark:bg-gray-900/85 rounded-lg shadow border-2 border-dashed border-purple-200 dark:border-gray-600">
              <BiImageAdd className="text-3xl text-purple-500 dark:text-purple-400 mb-2" />
              <span className="text-base font-medium text-gray-800 dark:text-white">
                Upload Event Image
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                1200x600px recommended
              </span>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
        )}
      </div>
    </motion.div>
  );
}