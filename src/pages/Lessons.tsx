import { BookOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Lessons = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <BookOpen className="h-16 w-16 text-accent mb-6 opacity-60" />
      <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Lessons</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        Lesson creation and management coming soon. You'll be able to build guided, scene-by-scene Bible geography lessons here.
      </p>
      <Button variant="outline" onClick={() => navigate("/")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back Home
      </Button>
    </div>
  );
};

export default Lessons;
