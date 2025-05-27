import * as RadixDialog from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { useState, type ReactElement } from 'react';
import { classNames } from '~/utils/classNames';
import { DialogTitle, dialogVariants, dialogBackdropVariants } from '~/components/ui/Dialog';
import { IconButton } from '~/components/ui/IconButton';
import styles from './Settings.module.scss';
import ProvidersTab from './providers/ProvidersTab';
import { useSettings } from '~/lib/hooks/useSettings';
import FeaturesTab from './features/FeaturesTab';
import DebugTab from './debug/DebugTab';
import EventLogsTab from './event-logs/EventLogsTab';
import ConnectionsTab from './connections/ConnectionsTab';
import DataTab from './data/DataTab';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

type TabType = 'data' | 'providers' | 'features' | 'debug' | 'event-logs' | 'connection';

export const SettingsWindow = ({ open, onClose }: SettingsProps) => {
  const { debug, eventLogs } = useSettings();
  const [activeTab, setActiveTab] = useState<TabType>('data');

  const tabs: { id: TabType; label: string; icon: string; component?: ReactElement }[] = [
    { id: 'data', label: 'Data', icon: 'i-ph:database', component: <DataTab /> },
    { id: 'providers', label: 'Providers', icon: 'i-ph:key', component: <ProvidersTab /> },
    { id: 'connection', label: 'Connection', icon: 'i-ph:link', component: <ConnectionsTab /> },
    { id: 'features', label: 'Features', icon: 'i-ph:star', component: <FeaturesTab /> },
    ...(debug
      ? [
          {
            id: 'debug' as TabType,
            label: 'Debug Tab',
            icon: 'i-ph:bug',
            component: <DebugTab />,
          },
        ]
      : []),
    ...(eventLogs
      ? [
          {
            id: 'event-logs' as TabType,
            label: 'Event Logs',
            icon: 'i-ph:list-bullets',
            component: <EventLogsTab />,
          },
        ]
      : []),
  ];

  return (
    <RadixDialog.Root open={open}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay asChild onClick={onClose}>
          <motion.div
            className="bg-black/50 fixed inset-0 z-max backdrop-blur-sm"
            initial="closed"
            animate="open"
            exit="closed"
            variants={dialogBackdropVariants}
          />
        </RadixDialog.Overlay>
        <RadixDialog.Content aria-describedby={undefined} asChild>
          <motion.div
            className="fixed top-[50%] left-[50%] z-max w-full h-full sm:h-[90vh] sm:w-[95vw] md:w-[90vw] md:max-w-[900px] translate-x-[-50%] translate-y-[-50%] border-0 sm:border sm:border-bolt-elements-borderColor sm:rounded-lg shadow-lg focus:outline-none overflow-hidden"
            initial="closed"
            animate="open"
            exit="closed"
            variants={dialogVariants}
          >
            {/* Changed to flex-col on small screens (default), sm:flex-row for larger screens */}
            <div className="flex flex-col sm:flex-row h-full">
              <div
                className={classNames(
                  'sm:w-48 border-b sm:border-b-0 sm:border-r border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 p-2 sm:p-4 flex flex-row sm:flex-col justify-start sm:justify-between overflow-x-auto sm:overflow-x-visible',
                  styles['settings-tabs'],
                )}
              >
                {/* Title hidden on small screens by default, shown on sm and up */}
                <DialogTitle className="hidden sm:block flex-shrink-0 text-base sm:text-lg font-semibold text-bolt-elements-textPrimary mb-0 sm:mb-2 mr-4 sm:mr-0">
                  Settings
                </DialogTitle>
                {/* Tab buttons container for horizontal scrolling on small screens */}
                <div className="flex flex-row sm:flex-col">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={classNames(
                        activeTab === tab.id ? styles.active : '',
                        'flex-shrink-0 sm:flex-shrink', // Allow shrinking for horizontal layout
                        styles['settings-tab-button'] // Added for specific tab button styling
                      )}
                      title={tab.label} // Add title for icon-only view
                    >
                      <div className={classNames(tab.icon, styles['tab-icon'])} />
                      <span className={styles['tab-label']}>{tab.label}</span>
                    </button>
                  ))}
                </div>
                {/* GitHub/Docs links hidden on small screens, shown on sm and up */}
                <div className="hidden sm:flex mt-auto flex-col gap-2">
                  <a
                    href="https://github.com/stackblitz-labs/bolt.diy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={classNames(styles['settings-button'], 'flex items-center gap-2')}
                  >
                    <div className="i-ph:github-logo" />
                    <span className={styles['settings-button-label']}>GitHub</span>
                  </a>
                  <a
                    href="https://stackblitz-labs.github.io/bolt.diy/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={classNames(styles['settings-button'], 'flex items-center gap-2')}
                  >
                    <div className="i-ph:book" />
                    <span className={styles['settings-button-label']}>Docs</span>
                  </a>
                </div>
              </div>

              {/* Adjusted padding and ensure content area scrolls independently */}
              <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 pt-6 sm:pt-8 md:pt-10 bg-bolt-elements-background-depth-2 overflow-y-auto">
                {/* Removed redundant flex-1 and overflow-y-auto from child div, already on parent */}
                {tabs.find((tab) => tab.id === activeTab)?.component}
              </div>
            </div>
            <RadixDialog.Close asChild onClick={onClose}>
              <IconButton icon="i-ph:x" className="absolute top-[10px] right-[10px] sm:top-[10px] sm:right-[10px]" />
            </RadixDialog.Close>
          </motion.div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};
