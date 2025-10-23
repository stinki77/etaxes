export const useLocalSearchParams = () => ({});
export const useRouter = () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() });
export const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
export const Stack = (p:any) => p.children;
export const Tabs = (p:any) => p.children;
