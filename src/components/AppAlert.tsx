import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface AppAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message: string;
}

/** 단순 알럿 (확인 버튼 1개) */
export const AppAlert = ({ open, onOpenChange, title, message }: AppAlertProps) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="max-w-[320px] rounded-[16px] p-6" style={{ background: "#FFFFFF" }}>
      <AlertDialogHeader>
        {title && <AlertDialogTitle className="text-center text-base">{title}</AlertDialogTitle>}
        <AlertDialogDescription className="text-center text-sm" style={{ color: "#333333" }}>
          {message}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="sm:justify-center">
        <AlertDialogAction className="bg-primary text-primary-foreground rounded-xl px-6">
          확인
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

interface AppConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmColor?: "danger" | "primary";
  onConfirm: () => void;
}

/** 컨펌 알럿 (확인 + 취소) */
export const AppConfirm = ({
  open,
  onOpenChange,
  message,
  confirmLabel,
  cancelLabel = "취소",
  confirmColor = "danger",
  onConfirm,
}: AppConfirmProps) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent
      className="max-w-[320px] rounded-[16px] p-6"
      style={{ background: "#FFFFFF" }}
    >
      <AlertDialogHeader>
        <AlertDialogTitle className="sr-only">확인</AlertDialogTitle>
        <AlertDialogDescription className="text-center text-sm" style={{ color: "#333333" }}>
          {message}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="flex-row gap-2 sm:flex-row">
        <AlertDialogCancel className="mt-0 flex-1 rounded-xl">{cancelLabel}</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          className="flex-1 rounded-xl text-white"
          style={{
            background: confirmColor === "danger" ? "#E57373" : "#7B5EA7",
          }}
        >
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
