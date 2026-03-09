import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { nanoid } from "nanoid";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Copy, Trash2, Loader2, QrCode } from "lucide-react";
import QRCodeModal from "./QRCodeModal";

interface LessonSettingsModalProps {
  open: boolean;
  onClose: () => void;
  lessonId: string;
}

interface LessonData {
  title: string;
  description: string | null;
  is_public: boolean;
  share_token: string | null;
}

export default function LessonSettingsModal({
  open,
  onClose,
  lessonId,
}: LessonSettingsModalProps) {
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (!open) return;

    supabase
      .from("lessons")
      .select("title, description, is_public, share_token")
      .eq("id", lessonId)
      .single()
      .then(({ data }) => {
        if (data) {
          setLesson(data);
          setTitle(data.title);
          setDescription(data.description ?? "");
          setIsPublic(data.is_public);
          setShareToken(data.share_token);
        }
      });
  }, [open, lessonId]);

  const shareUrl = shareToken
    ? `${window.location.origin}/share/${shareToken}`
    : null;

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("lessons")
      .update({
        title,
        description: description || null,
        is_public: isPublic,
        share_token: shareToken,
      })
      .eq("id", lessonId);

    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Lesson settings saved");
      onClose();
    }
  };

  const handleGenerateLink = async () => {
    const token = nanoid(12);
    setShareToken(token);
    setIsPublic(true);

    const { error } = await supabase
      .from("lessons")
      .update({ share_token: token, is_public: true })
      .eq("id", lessonId);

    if (error) {
      toast.error("Failed to generate share link");
      return;
    }

    const url = `${window.location.origin}/share/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Share link copied to clipboard!");
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Copied!");
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase
      .from("lessons")
      .delete()
      .eq("id", lessonId);

    if (error) {
      toast.error("Failed to delete: " + error.message);
      setDeleting(false);
      return;
    }

    toast.success("Lesson deleted");
    navigate("/dashboard");
  };

  if (!lesson) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Lesson Settings</DialogTitle>
          <DialogDescription>
            Edit details, sharing, or delete this lesson.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="lesson-title" className="text-xs">Title</Label>
            <Input
              id="lesson-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="lesson-desc" className="text-xs">Description</Label>
            <Textarea
              id="lesson-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Public toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Public</Label>
              <p className="text-[10px] text-muted-foreground">
                Allow anyone with the link to view
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          {/* Share link */}
          <div className="space-y-1.5">
            <Label className="text-xs">Share Link</Label>
            {shareUrl ? (
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={shareUrl}
                  className="text-xs font-mono"
                />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  <Copy size={14} />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={handleGenerateLink}
              >
                Generate Share Link
              </Button>
            )}
          </div>

          {/* Save */}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Save Changes
          </Button>

          {/* Danger zone */}
          <div className="border-t border-border/40 pt-4">
            <p className="text-[10px] uppercase tracking-widest text-destructive mb-2">
              Danger Zone
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <Trash2 size={14} className="mr-1" />
                  Delete Lesson
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this lesson?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the lesson and all its scenes.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
