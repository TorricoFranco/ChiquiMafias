import SupportDashboard from '@/components/admin/support/SupportDashboard';

export const metadata = {
    title: 'Panel de Soporte | Admin',
};

export default function AdminSupportPage() {
    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Centro de Moderación</h1>
                <p className="text-gray-500">Gestioná los tickets de soporte y reportes de usuarios.</p>
            </div>

            {/* Renderizamos el componente cliente que maneja el estado */}
            <SupportDashboard />
        </div>
    );
}