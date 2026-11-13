import { redirect } from "next/navigation";
import { TOOLS } from "@/lib/tools";

export default function ToolsPage() {
  redirect(TOOLS[0].href);
}
