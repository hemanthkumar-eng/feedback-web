import { BrowserRouter, Route, Routes } from "react-router-dom";
import HomePage from "./HomePage";
import WorkOrderFeedbackPage from "./WorkOrderFeedbackPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/feedback/:token" element={<WorkOrderFeedbackPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
