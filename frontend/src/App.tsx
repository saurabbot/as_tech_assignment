import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import Navbar from "./components/layout/Navbar";
import RegisterForm from "./components/auth/RegisterForm";
import LoginForm from "./components/auth/LoginForm";
import FilesPage from "./pages/files/FilesPage";
import SecuritySettings from "./pages/SecuritySettings";
import { Provider } from "react-redux";
import { store } from "./store";

function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Provider store={store}>
      <Router>
        <div className="min-h-screen w-screen flex flex-col bg-gray-100">
          <Navbar
            isSidebarOpen={isSidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
          <main className="max-w-7xl mx-auto py-6 px-4">
            <Routes>
              <Route path="/" element={<div>Home Page</div>} />
              <Route path="/login" element={<LoginForm />} />
              <Route path="/register" element={<RegisterForm />} />
              <Route path="/files" element={<FilesPage />} />
              <Route path="/shared" element={<div>Shared Files Page</div>} />
              <Route path="/settings" element={<SecuritySettings />} />
            </Routes>
          </main>
        </div>
      </Router>
    </Provider>
  );
}

export default App;
