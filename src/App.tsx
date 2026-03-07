import AppToast from "@/components/AppToast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Home from "./pages/Home";
import PostDetail from "./pages/PostDetail";
import Profile from "./pages/Profile";
import SignupCode from "./pages/SignupCode";
import SignupAuth from "./pages/SignupAuth";
import SignupProfile from "./pages/SignupProfile";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import SettingsNickname from "./pages/SettingsNickname";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Category from "./pages/Category";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppToast />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/home" element={<Home />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/category" element={<Category />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/nickname" element={<SettingsNickname />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/signup/code" element={<SignupCode />} />
          <Route path="/signup/auth" element={<SignupAuth />} />
          <Route path="/signup/profile" element={<SignupProfile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
