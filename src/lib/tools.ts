export const TOOLS = [
  { href: "/tools/password-generator", label: "비밀번호 생성기", shortLabel: "비밀번호", icon: "password" },
  { href: "/tools/tech-stack", label: "기술스택 이미지 생성기", shortLabel: "기술스택", icon: "stack" },
  { href: "/tools/golden-ratio", label: "황금비율 계산기", shortLabel: "황금비율", icon: "ratio" },
] as const;

export const TOOLS_SIDEBAR_STORAGE_KEY = "tools-sidebar-collapsed";

// Runs in <head> before the body is painted. It mirrors a remembered open sidebar onto <html>,
// where the `tools-open` CSS variant sizes the layout, so hydration never moves the page.
export const TOOLS_SIDEBAR_BOOT_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(TOOLS_SIDEBAR_STORAGE_KEY)})==="false")document.documentElement.dataset.toolsSidebar="open"}catch(e){}`;
