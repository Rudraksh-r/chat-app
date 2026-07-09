import { create } from 'zustand';

const useThemeStore = create((set) => ({
  theme: localStorage.getItem('theme') || 'light',
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    set({ theme });
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },
  toggleTheme: () => {
    const currentTheme = useThemeStore.getState().theme;
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    set({ theme: newTheme });
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },
  initTheme: () => {
    const theme = localStorage.getItem('theme') || 'light';
    set({ theme });
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },
  chatThemes: JSON.parse(localStorage.getItem('chatThemes') || '{}'),
  setChatTheme: (chatId, themeName) => {
    set((state) => {
      const updated = { ...state.chatThemes, [chatId]: themeName };
      localStorage.setItem('chatThemes', JSON.stringify(updated));
      return { chatThemes: updated };
    });
  }
}));

export default useThemeStore;
