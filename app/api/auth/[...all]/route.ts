import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/auth";

const handlers = toNextJsHandler(auth);
const GET = handlers.GET;
const POST = handlers.POST;

export { GET, POST };
