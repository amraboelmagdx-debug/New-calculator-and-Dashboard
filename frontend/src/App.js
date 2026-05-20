import "@/App.css";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Calculator from "@/pages/Calculator";
import Admin from "@/pages/Admin";
import SalesDashboard from "@/pages/SalesDashboard";

function App() {
  return (
    <div className="App">
      <HashRouter>
        <Routes>
          <Route path="/" element={<Calculator />} />
          <Route path="/sales-dashboard" element={<SalesDashboard />} />
          <Route path="/admin/*" element={<Admin />} />
        </Routes>
      </HashRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
