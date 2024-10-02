import { AudioTranscription } from "@/components/audio-transcription";
import { signout } from "./login/actions";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="font-sans relative">
      <form action={signout} className="absolute top-4 right-4 z-10">
        <Button type="submit" className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
          Sign Out
        </Button>
      </form>
      <AudioTranscription />
    </div>
  );
}
