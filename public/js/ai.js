// AI Services for KindTrack
// In a real production app, these should be called via a backend (Firebase Functions) to protect API keys.

export async function getAIReflection(activities) {
    if (activities.length === 0) {
        return "Start logging your acts of kindness to see personalized AI reflections on your impact!";
    }

    const activityTitles = activities.map(a => a.title).join(", ");

    // Simulate API call to OpenAI
    // Prompt: "Analisis daftar tindakan kebaikan berikut dan tuliskan refleksi singkat yang memotivasi pengguna untuk terus melakukan kebaikan: [activityTitles]"

    // Mock response based on activity count
    const count = activities.length;
    if (count < 3) {
        return "You've started a wonderful journey. Even these small acts like '" + activities[0].title + "' show that you care. Keep going!";
    } else if (count < 10) {
        return "You've been consistent! With " + count + " acts of kindness, you're building a habit that changes the world. Your recent act: '" + activities[0].title + "' is truly inspiring.";
    } else {
        return "You are a kindness champion! Your dedication to help others is creating a significant impact. Remember, global change starts with people like you.";
    }
}

export async function getDailyIdea() {
    // In a real app, this would be fetched from a DB or generated once per day via AI
    const ideas = [
        "Hari ini coba kirim pesan apresiasi kepada seseorang yang pernah membantu kamu.",
        "Give a sincere compliment to 3 people you meet today.",
        "Leave a positive comment on a friend's social media post.",
        "Pick up one piece of litter you see on the street.",
        "Hold the door open for someone today with a smile."
    ];

    // Persistent daily idea (saved in localStorage)
    const today = new Date().toDateString();
    const saved = localStorage.getItem('kindtrack_daily_idea');
    const savedDate = localStorage.getItem('kindtrack_idea_date');

    if (saved && savedDate === today) {
        return saved;
    } else {
        const newIdea = ideas[Math.floor(Math.random() * ideas.length)];
        localStorage.setItem('kindtrack_daily_idea', newIdea);
        localStorage.setItem('kindtrack_idea_date', today);
        return newIdea;
    }
}
