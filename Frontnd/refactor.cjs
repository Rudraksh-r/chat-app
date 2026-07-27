const fs = require('fs');
const path = require('path');

const filePath = 'c:/Codes/chat-app/Frontnd/src/app/pages/ChatLayout.jsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /import useThemeStore from "\.\.\/store\/themeStore";\s*import \{ toast \} from "sonner";/,
  `import useThemeStore from "../store/themeStore";\nimport { useIsMobile } from "../hooks/use-mobile";\nimport { toast } from "sonner";`
);

content = content.replace(
  /const \[sidebarOpen, setSidebarOpen\] = useState\(true\);/,
  `const isMobile = useIsMobile();`
);

content = content.replace(
  /setSearchResults\(\[\]\);\s*setSidebarOpen\(false\);\s*\};/,
  `setSearchResults([]);\n  };`
);

const oldSidebarWrapper = `<div className="flex h-screen w-full overflow-hidden bg-background font-sans text-foreground app-shell">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && activeConversation && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <Motion.div
        drag="x"
        dragConstraints={{ right: 0 }}
        dragElastic={0.1}
        onDragEnd={(e, { offset, velocity }) => {
          if (offset.x < -100 || velocity.x < -500) {
            setSidebarOpen(false);
          }
        }}
        initial={false}
        animate={{ x: sidebarOpen ? 0 : "-100%" }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        style={{ touchAction: "pan-y" }}
        className="fixed md:relative z-50 flex h-full w-full shrink-0 flex-col bg-sidebar md:w-[360px] md:border-r md:border-sidebar-border md:!transform-none"
      >`;

const newSidebarWrapper = `<div className="flex h-screen w-full overflow-hidden bg-background font-sans text-foreground app-shell relative">
      {/* Sidebar - Base Layer */}
      <div className="relative z-0 flex h-full w-full shrink-0 flex-col bg-sidebar md:w-[360px] md:border-r md:border-sidebar-border">`;

content = content.replace(oldSidebarWrapper.replace(/\r\n/g, '\n'), newSidebarWrapper);
content = content.replace(oldSidebarWrapper.replace(/\n/g, '\r\n'), newSidebarWrapper);

content = content.replace(
  /className="mx-2 flex min-h-\[76px\] cursor-pointer items-center gap-3 rounded-2xl px-3 transition-all hover:bg-secondary\/60"/g,
  `className="mx-2 flex min-h-[76px] cursor-pointer items-center gap-3 rounded-2xl px-3 transition-all hover:bg-secondary/60 active:scale-[0.97] duration-150"`
);

content = content.replace(
  /setActiveConversation\(convo\);\s*setSidebarOpen\(false\);\s*\}/,
  `setActiveConversation(convo);\n                  }}`
);

content = content.replace(
  /"group mx-2 flex min-h-\[76px\] cursor-pointer items-center gap-3 rounded-2xl px-3 transition-all",/,
  `"group mx-2 flex min-h-[76px] cursor-pointer items-center gap-3 rounded-2xl px-3 transition-all active:scale-[0.97] duration-150",`
);

const oldChatWrapper = `        </div>
      </Motion.div>

      {/* Main Chat Area */}
      <div className="relative flex min-w-0 flex-1 flex-col bg-background">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <Motion.div`;

const newChatWrapper = `        </div>
      </div>

      {/* Main Chat Area */}
      <AnimatePresence initial={false}>
        {(!isMobile || activeConversation) && (
          <Motion.div
            key="chat-area"
            initial={isMobile ? { x: "100%" } : false}
            animate={{ x: 0 }}
            exit={isMobile ? { x: "100%" } : {}}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            drag={isMobile ? "x" : false}
            dragConstraints={{ left: 0 }}
            dragElastic={0.1}
            onDragEnd={(e, { offset, velocity }) => {
              if (isMobile && (offset.x > 100 || velocity.x > 500)) {
                setActiveConversation(null);
              }
            }}
            style={isMobile ? { touchAction: "pan-y" } : {}}
            className="fixed inset-0 z-10 flex min-w-0 flex-col bg-background shadow-2xl md:relative md:flex-1 md:shadow-none md:!transform-none"
          >
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <Motion.div`;

content = content.replace(oldChatWrapper.replace(/\r\n/g, '\n'), newChatWrapper);
content = content.replace(oldChatWrapper.replace(/\n/g, '\r\n'), newChatWrapper);


content = content.replace(
  /className="mr-1 -ml-2 text-primary md:hidden"\s*onClick=\{\(\) => setSidebarOpen\(true\)\}/,
  `className="mr-1 -ml-2 text-primary md:hidden active:scale-[0.97] transition-transform duration-150"\n                  onClick={() => setActiveConversation(null)}`
);

const oldChatEnd = `        )}
      </div>

      {/* Image Modal */}`;

const newChatEnd = `        )}
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Image Modal */}`;

content = content.replace(oldChatEnd.replace(/\r\n/g, '\n'), newChatEnd);
content = content.replace(oldChatEnd.replace(/\n/g, '\r\n'), newChatEnd);


fs.writeFileSync(filePath, content, 'utf8');
console.log("Replacements successful.");
