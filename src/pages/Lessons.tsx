import Logo from "@/components/Logo";
import AppHeader from "@/components/AppHeader";

const Lessons = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <BookOpen className="h-16 w-16 text-accent mb-6 opacity-60" />
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Lessons</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          Lesson creation and management coming soon. You'll be able to build guided, scene-by-scene Bible geography lessons here.
        </p>
      </div>
    </div>
  );
};

export default Lessons;
