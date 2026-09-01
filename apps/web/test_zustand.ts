import { createStore } from 'zustand';
const store = createStore((set) => ({ count: 0, inc: () => set((s:any) => ({ count: s.count + 1 })) }));
const unsubscribe = store.subscribe((state) => console.log('sub:', state.count));
store.getState().inc();
