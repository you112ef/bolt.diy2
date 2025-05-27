import { motion, AnimatePresence, type Variants, Suspense, lazy } from 'framer-motion'; // Added Suspense, lazy
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useStore } from '@nanostores/react';
import { Dialog, DialogButton, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import { ThemeSwitch } from '~/components/ui/ThemeSwitch';
// import { SettingsWindow } from '~/components/settings/SettingsWindow'; // Original import
import { SettingsButton } from '~/components/ui/SettingsButton';
import { db, deleteById, getAll, chatId, type ChatHistoryItem, useChatHistory } from '~/lib/persistence';
import { workbenchStore } from '~/lib/stores/workbench'; // Import workbenchStore
import { logger } from '~/utils/logger';
import { HistoryItem } from './HistoryItem';
import { binDates } from './date-binning';
import { useSearchFilter } from '~/lib/hooks/useSearchFilter';
import { classNames } from '~/utils/classNames';

type DialogContent = { type: 'delete'; item: ChatHistoryItem } | null;

// Lazy load SettingsWindow
const SettingsWindow = lazy(() =>
  import('~/components/settings/SettingsWindow').then(module => ({ default: module.SettingsWindow }))
);

const backdropVariants: Variants = {
  open: { opacity: 1, display: 'block', transition: { duration: 0.3 } },
  closed: { opacity: 0, transition: { duration: 0.3 }, transitionEnd: { display: 'none' } },
};

const sidebarVariants: Variants = {
  open: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30, duration: 0.3 },
  },
  closed: {
    x: '-100%',
    opacity: 0.8, // Keep it slightly visible while sliding out for effect if desired
    transition: { type: 'spring', stiffness: 300, damping: 30, duration: 0.3 },
  },
};

// Specific variants for desktop where sidebar is part of layout
const desktopSidebarVariants: Variants = {
  open: { x: 0, opacity: 1 }, // Always open
  closed: { x: 0, opacity: 1 }, // Effectively always open
};


function CurrentDateTime() {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setDateTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 px-4 py-3 font-bold text-gray-700 dark:text-gray-300 border-b border-bolt-elements-borderColor flex-shrink-0">
      <div className="h-4 w-4 i-ph:clock-thin" />
      {dateTime.toLocaleDateString()} {dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </div>
  );
}

export const Menu = () => {
  const { duplicateCurrentChat, exportChat } = useChatHistory();
  const isSidebarOpen = useStore(workbenchStore.isSidebarOpen);
  const [isDesktop, setIsDesktop] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const [list, setList] = useState<ChatHistoryItem[]>([]);
  const [dialogContent, setDialogContent] = useState<DialogContent>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { filteredItems: filteredList, handleSearchChange } = useSearchFilter({
    items: list,
    searchFields: ['description'],
  });

  useEffect(() => {
    const checkDesktop = () => {
      const desktop = window.innerWidth >= 768; // md breakpoint
      setIsDesktop(desktop);
      // If transitioning to desktop view, ensure sidebar is open.
      // If transitioning to mobile, let current isSidebarOpen state persist.
      if (desktop) {
        workbenchStore.toggleSidebar(true);
      }
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);
  
  const loadEntries = useCallback(() => {
    if (db) {
      getAll(db)
        .then((list) => list.filter((item) => item.urlId && item.description))
        .then(setList)
        .catch((error) => toast.error(error.message));
    }
  }, []);

  useEffect(() => {
    if (isSidebarOpen || isDesktop) { // Load entries if sidebar is open OR if it's desktop (always visible)
      loadEntries();
    }
  }, [isSidebarOpen, isDesktop, loadEntries]);

  const deleteItem = useCallback((event: React.UIEvent, item: ChatHistoryItem) => {
    event.preventDefault();
    if (db) {
      deleteById(db, item.id)
        .then(() => {
          loadEntries();
          if (chatId.get() === item.id) {
            window.location.pathname = '/';
          }
        })
        .catch((error) => {
          toast.error('Failed to delete conversation');
          logger.error(error);
        });
    }
  }, [loadEntries]);

  const closeDialog = () => {
    setDialogContent(null);
  };

  const handleDeleteClick = (event: React.UIEvent, item: ChatHistoryItem) => {
    event.preventDefault();
    setDialogContent({ type: 'delete', item });
  };

  const handleDuplicate = async (id: string) => {
    await duplicateCurrentChat(id);
    loadEntries();
  };

  const handleToggleSidebar = () => {
    // On mobile, toggleSidebar will flip the state.
    // On desktop, this function effectively does nothing if we want the sidebar always open.
    // However, if a close button were added FOR desktop, it could call toggleSidebar(false).
    if (!isDesktop) {
      workbenchStore.toggleSidebar();
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isDesktop && isSidebarOpen && (
          <motion.div
            key="sidebar-backdrop"
            className="fixed inset-0 bg-black/30 z-menu-backdrop md:hidden"
            variants={backdropVariants}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={handleToggleSidebar}
          />
        )}
      </AnimatePresence>
      <motion.div
        key="sidebar-panel"
        ref={menuRef}
        custom={isDesktop}
        initial="closed"
        animate={isDesktop ? 'open' : (isSidebarOpen ? 'open' : 'closed')} // Use store state for mobile
        variants={isDesktop ? desktopSidebarVariants : sidebarVariants}
        className={classNames(
          "flex selection-accent flex-col side-menu h-full bg-bolt-elements-background-depth-2 border-r border-bolt-elements-borderColor text-sm",
          isDesktop 
            ? "relative w-[320px] shadow-none rounded-r-none z-10" // z-10 to be above chat potentially
            : "fixed top-0 left-0 w-[calc(min(100vw-50px,300px))] shadow-xl rounded-r-3xl z-sidebar" // z-sidebar for overlay
        )}
      >
        {!isDesktop && <div className="h-[20px] flex-shrink-0" />} {/* Spacer for mobile view */}
        <CurrentDateTime />
        <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
          <div className="p-4 select-none flex-shrink-0">
            <a
              href="/"
              className="flex gap-2 items-center bg-bolt-elements-sidebar-buttonBackgroundDefault text-bolt-elements-sidebar-buttonText hover:bg-bolt-elements-sidebar-buttonBackgroundHover rounded-md p-2 transition-theme mb-4"
            >
              <span className="inline-block i-bolt:chat scale-110" />
              Start new chat
            </a>
            <div className="relative w-full">
              <input
                className="w-full bg-white dark:bg-bolt-elements-background-depth-4 relative px-2 py-1.5 rounded-md focus:outline-none placeholder-bolt-elements-textTertiary text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary border border-bolt-elements-borderColor"
                type="search"
                placeholder="Search"
                onChange={handleSearchChange}
                aria-label="Search chats"
              />
            </div>
          </div>
          <div className="text-bolt-elements-textPrimary font-medium pl-6 pr-5 my-2 flex-shrink-0">Your Chats</div>
          <div className="flex-1 overflow-y-auto pl-4 pr-5 pb-5">
            {filteredList.length === 0 && (
              <div className="pl-2 text-bolt-elements-textTertiary">
                {list.length === 0 ? 'No previous conversations' : 'No matches found'}
              </div>
            )}
            <DialogRoot open={dialogContent !== null}>
              {binDates(filteredList).map(({ category, items }) => (
                <div key={category} className="mt-4 first:mt-0 space-y-1">
                  <div className="text-bolt-elements-textTertiary sticky top-0 z-10 bg-bolt-elements-background-depth-2 pl-2 pt-2 pb-1">
                    {category}
                  </div>
                  {items.map((item) => (
                    <HistoryItem
                      key={item.id}
                      item={item}
                      exportChat={exportChat}
                      onDelete={(event) => handleDeleteClick(event, item)}
                      onDuplicate={() => handleDuplicate(item.id)}
                    />
                  ))}
                </div>
              ))}
              <Dialog onBackdrop={closeDialog} onClose={closeDialog}>
                {dialogContent?.type === 'delete' && (
                  <>
                    <DialogTitle>Delete Chat?</DialogTitle>
                    <DialogDescription asChild>
                      <div>
                        <p>
                          You are about to delete <strong>{dialogContent.item.description}</strong>.
                        </p>
                        <p className="mt-1">Are you sure you want to delete this chat?</p>
                      </div>
                    </DialogDescription>
                    <div className="px-5 pb-4 bg-bolt-elements-background-depth-2 flex gap-2 justify-end">
                      <DialogButton type="secondary" onClick={closeDialog}>
                        Cancel
                      </DialogButton>
                      <DialogButton
                        type="danger"
                        onClick={(event) => {
                          deleteItem(event, dialogContent.item);
                          closeDialog();
                        }}
                      >
                        Delete
                      </DialogButton>
                    </div>
                  </>
                )}
              </Dialog>
            </DialogRoot>
          </div>
          <div className="flex items-center justify-between border-t border-bolt-elements-borderColor p-4 flex-shrink-0">
            <SettingsButton onClick={() => setIsSettingsOpen(true)} />
            <ThemeSwitch />
          </div>
        </div>
        {isSettingsOpen && (
          <Suspense fallback={<div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 text-white">Loading Settings...</div>}>
            <SettingsWindow open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
          </Suspense>
        )}
      </motion.div>
    </>
  );
};
