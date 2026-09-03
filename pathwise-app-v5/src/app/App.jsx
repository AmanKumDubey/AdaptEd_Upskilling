import { AppRouter } from "./router";
import { PathwiseDataProvider } from "../state/PathwiseDataContext";

export default function App() {
  return (
    <PathwiseDataProvider>
      <AppRouter />
    </PathwiseDataProvider>
  );
}
