import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../services/api";
import { X, Calendar, Clock, Video, User } from "lucide-react";

export default function InterviewModal({ candidateId, candidateName, onClose, onSuccess }) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        interviewer_name: "",
        scheduled_at_date: "",
        scheduled_at_time: "",
        meet_link: ""
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const generateMeetLink = () => {
        // Mock generate link
        const randomString = Math.random().toString(36).substring(2, 12);
        setFormData({ ...formData, meet_link: `https://meet.google.com/${randomString.substring(0, 3)}-${randomString.substring(3, 7)}-${randomString.substring(7)}` });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const scheduled_at = `${formData.scheduled_at_date} ${formData.scheduled_at_time}:00`;

        try {
            const res = await apiFetch("/interviews", {
                method: "POST",
                body: JSON.stringify({
                    candidate_id: candidateId,
                    interviewer_name: formData.interviewer_name,
                    scheduled_at: scheduled_at,
                    meet_link: formData.meet_link
                })
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                alert("Failed to schedule interview");
            }
        } catch (err) {
            console.error(err);
            alert("Error scheduling interview");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-0 md:p-4">
            <div className="bg-white w-full h-full md:rounded-2xl md:shadow-xl md:max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200 flex flex-col">

                {/* Header */}
                <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-5 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold">{t("Schedule Interview")}</h2>
                        <p className="text-teal-100 text-sm mt-0.5 font-medium">{candidateName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="space-y-4">

                        {/* Interviewer Name */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                                <User size={16} className="text-teal-500" />
                                {t("Interviewer Name")}
                            </label>
                            <input
                                required
                                type="text"
                                name="interviewer_name"
                                value={formData.interviewer_name}
                                onChange={handleChange}
                                placeholder="e.g. John Doe"
                                className="w-full border border-gray-200 bg-gray-50/50 px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
                            />
                        </div>

                        {/* Date & Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                                    <Calendar size={16} className="text-teal-500" />
                                    {t("Date")}
                                </label>
                                <input
                                    required
                                    type="date"
                                    name="scheduled_at_date"
                                    value={formData.scheduled_at_date}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 bg-gray-50/50 px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-gray-700"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                                    <Clock size={16} className="text-teal-500" />
                                    {t("Time")}
                                </label>
                                <input
                                    required
                                    type="time"
                                    name="scheduled_at_time"
                                    value={formData.scheduled_at_time}
                                    onChange={handleChange}
                                    className="w-full border border-gray-200 bg-gray-50/50 px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-gray-700"
                                />
                            </div>
                        </div>

                        {/* Meet Link */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Video size={16} className="text-teal-500" />
                                    {t("Meet Link")}
                                </div>
                                <button
                                    type="button"
                                    onClick={generateMeetLink}
                                    className="text-xs text-teal-600 font-bold hover:text-teal-700"
                                >
                                    Generate
                                </button>
                            </label>
                            <input
                                required
                                type="url"
                                name="meet_link"
                                value={formData.meet_link}
                                onChange={handleChange}
                                placeholder="https://meet.google.com/..."
                                className="w-full border border-gray-200 bg-gray-50/50 px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-teal-600"
                            />
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="mt-8 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            {t("Cancel")}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white bg-teal-500 hover:bg-teal-600 transition-colors disabled:opacity-70 flex justify-center items-center"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                t("Schedule")
                            )}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
}
