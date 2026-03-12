const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL || 'https://placeholder.supabase.co', 
    process.env.SUPABASE_KEY || 'placeholder_key'
);

/**
 * Récupère les informations détaillées d'un label (Maladie ou Pest)
 */
exports.getLabelDetails = async (label) => {
    if (!label || label === 'RAS' || label === 'Sain') return null;
    
    const { data, error } = await supabase
        .from('diseases_info')
        .select('label, scientific_name, common_name')
        .eq('label', label)
        .single();
    
    if (error) return null;
    return data;
};

exports.getRecommendations = async (diseaseLabel, pestLabel) => {
    const labels = [];
    if (diseaseLabel && diseaseLabel !== 'RAS' && diseaseLabel !== 'Sain') labels.push(diseaseLabel);
    if (pestLabel && pestLabel !== 'RAS' && pestLabel !== 'Sain') labels.push(pestLabel);
    
    if (labels.length === 0) return [];

    const { data, error } = await supabase.from('diseases_info').select('*').in('label', labels);
    if (error) { console.error("Erreur DB fetch recs:", error); return []; }
    return data;
};

exports.getTrackingInfo = async (trackingId) => {
    const { data } = await supabase.from('plants_tracking').select('*').eq('id', trackingId).single();
    return data;
};

exports.resolveTracking = async (trackingId) => {
    await supabase.from('plants_tracking').update({ status: 'gueri', next_checkup_date: null }).eq('id', trackingId);
};

exports.updateOrInsertTracking = async (trackingId, fieldId, gravity, isRealTime) => {
    let missedCount = 0;
    const now = new Date();

    if (trackingId) {
        const existing = await this.getTrackingInfo(trackingId);
        if (existing && existing.next_checkup_date) {
            const nextDate = new Date(existing.next_checkup_date);
            if (now > new Date(nextDate.getTime() + 24*60*60*1000)) {
                missedCount = existing.missed_checkups_count + 1;
            }
        }
    }

    let delayDays = 7; 
    let urgencyLevel = "NORMAL";

    if (gravity >= 35) { delayDays = 2; urgencyLevel = "CRITIQUE"; }
    else if (gravity >= 10) { delayDays = 4; urgencyLevel = "ATTENTION"; }

    delayDays = Math.max(1, delayDays - missedCount);
    if (isRealTime) delayDays = delayDays / 24.0;

    const nextCheckupDate = new Date(now.getTime() + delayDays * 24 * 60 * 60 * 1000);
    let finalTrackingId = trackingId;

    if (trackingId) {
        await supabase.from('plants_tracking').update({
            last_gravity: gravity,
            next_checkup_date: nextCheckupDate,
            missed_checkups_count: missedCount,
            updated_at: now
        }).eq('id', trackingId);
    } else {
        const { data } = await supabase.from('plants_tracking').insert([{
            field_id: fieldId,
            status: 'en_cours',
            last_gravity: gravity,
            next_checkup_date: nextCheckupDate,
            missed_checkups_count: 0
        }]).select().single();
        finalTrackingId = data?.id;
    }

    return { trackingId: finalTrackingId, nextDate: nextCheckupDate, urgencyLevel, missedCount };
};

exports.saveHistory = async (historyData) => {
    const { trackingId, imageUrls, avgGravity, species, disease, pest, evolutionAdvice, isRealTime } = historyData;
    await supabase.from('tracking_history').insert([{
        tracking_id: trackingId,
        image_urls: imageUrls,
        avg_gravity: avgGravity,
        detected_species: species,
        detected_disease: disease,
        detected_pest: pest,
        evolution_advice: evolutionAdvice,
        is_realtime: isRealTime
    }]);
};