// AI Services for KindTrack
// In a real production app, these should be called via a backend (Firebase Functions) to protect API keys.

/**
 * Simulates a typewriter effect for AI responses
 */
function typeWriter(text, elementId, speed = 30) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.innerHTML = "";
    element.classList.add('ai-text-loading');

    let i = 0;
    function type() {
        if (i < text.length) {
            element.classList.remove('ai-text-loading');
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    type();
}

export async function getAIReflection(activities) {
    if (!activities || activities.length === 0) {
        return "Inisialisasi sistem... Hubungkan data kebaikan Anda untuk memicu analisis neural. Dampak Anda menunggu untuk dipetakan.";
    }

    const latestTitle = activities[0].title;
    const count = activities.length;

    // Skenario Respons AI Futuristik
    const responses = [
        `Analisis Neural Selesai. Pola kebaikan terdeteksi: "${latestTitle}". Frekuensi kebaikan Anda berada di level optimal. Terus pancarkan energi positif ini ke seluruh jaringan sosial Anda.`,
        `Sistem KindTrack mengidentifikasi resonansi moral tinggi. Dengan ${count} aksi terverifikasi, Anda sedang merekayasa ulang lingkungan sekitar menjadi lebih harmonis. Target efisiensi dampak tercapai.`,
        `Proyeksi Masa Depan: Aksi Anda "${latestTitle}" telah menciptakan riak (ripple effect) yang tak terlihat. Data menunjukkan peningkatan indeks kebahagiaan kolektif di sekitar koordinat Anda.`,
        `Protokol 'Altruisme' Berjalan. Anda bukan sekadar pengguna; Anda adalah node utama dalam jaringan kebaikan global kami. ${count} kontribusi Anda telah memperkuat infrastruktur empati digital.`
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    // Jika dipanggil dari dashboard, gunakan typewriter
    if (document.getElementById('ai-reflection-text')) {
        typeWriter(randomResponse, 'ai-reflection-text');
        return randomResponse; // Return tetap untuk sync
    }

    return randomResponse;
}

export async function getDailyIdea() {
    const ideas = [
        "Transmisi Pesan: Kirimkan frekuensi apresiasi kepada rekan kerja atau teman melalui sinyal digital hari ini.",
        "Protokol Apresiasi: Berikan validasi positif kepada 3 node (orang) di jaringan terdekat Anda.",
        "Optimasi Lingkungan: Ambil satu entitas sampah (polutan) dan tempatkan pada wadah pembuangan yang tepat.",
        "Interaksi Empatetik: Gunakan sensor sosial Anda untuk mendeteksi siapa yang membutuhkan dukungan mental hari ini.",
        "Sinyal Senyuman: Pancarkan visualisasi keramahan saat berinteraksi dengan orang asing pertama yang Anda temui."
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
