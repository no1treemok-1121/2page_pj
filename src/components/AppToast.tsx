import { Toaster as SonnerToaster } from "sonner";

const AppToast = () => {
  return (
    <SonnerToaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: "#333333",
          color: "#FFFFFF",
          borderRadius: "8px",
          border: "none",
          fontSize: "14px",
        },
        duration: 2500,
      }}
    />
  );
};

export default AppToast;
