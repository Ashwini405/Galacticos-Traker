import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { apiFetch } from "../services/api";

export default function DataValidation() {
    const [masterData, setMasterData] = useState({
        job_roles: [],
        clients: [],
        funnel_stages: [],
        contract_types: [],
        office_modes: [],
        recruiters: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch("/master-data")
            .then(res => res.json())
            .then(data => {
                setMasterData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load master data", err);
                setLoading(false);
            });
    }, []);

    const DataCard = ({ title, items, icon, colorClass }) => (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
                    {icon}
                </div>
                <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
            </div>

            <div className="bg-gray-50/50 rounded-xl flex-1 border border-gray-100 overflow-hidden">
                {items?.length > 0 ? (
                    <ul className="divide-y divide-gray-100">
                        {items.map((item, idx) => (
                            <li key={idx} className="px-4 py-3 text-sm text-gray-600 font-medium hover:bg-white transition flex justify-between items-center group">
                                <span>{item.name}</span>
                                <span className="text-gray-300 text-xs px-2 opacity-0 group-hover:opacity-100 transition">ID: {item.id}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">No items found</div>
                )}
            </div>
        </div>
    );

    return (
        <Layout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Master Data Validation</h1>
                <p className="text-gray-500 max-w-2xl">
                    This is the central repository of allowed parameters for the recruitment system. All candidate entries must strictly adhere to the IDs provided here.
                    The backend pulls these directly from the SQL lookup tables (`job_roles`, `clients`, etc.).
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

                    <DataCard
                        title="Job Roles"
                        items={masterData.job_roles}
                        colorClass="bg-blue-50 text-blue-600"
                        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                    />

                    <DataCard
                        title="Funnel Stages"
                        items={masterData.funnel_stages}
                        colorClass="bg-purple-50 text-purple-600"
                        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>}
                    />

                    <DataCard
                        title="Corporate Clients"
                        items={masterData.clients}
                        colorClass="bg-teal-50 text-teal-600"
                        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                    />

                    <DataCard
                        title="Office Modes"
                        items={masterData.office_modes}
                        colorClass="bg-orange-50 text-orange-600"
                        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    />

                    <DataCard
                        title="Contract Types"
                        items={masterData.contract_types}
                        colorClass="bg-red-50 text-red-600"
                        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                    />

                    <DataCard
                        title="Admin Recruiters"
                        items={masterData.recruiters}
                        colorClass="bg-indigo-50 text-indigo-600"
                        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                    />

                </div>
            )}
        </Layout>
    );
}
