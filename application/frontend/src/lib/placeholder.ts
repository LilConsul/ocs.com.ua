// Stand-in for a product without photos. It must be imported from src/assets so <Image> gets real
// metadata: a plain "/placeholder.svg" string fails the build (MissingImageDimension).
export { default as PLACEHOLDER_IMAGE } from "@/assets/placeholder.svg";
