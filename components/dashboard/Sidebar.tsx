"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getTenantFromStorage, logoutTenant, TenantData } from "@/lib/auth";
import { 
  LayoutDashboard, 
  UserPlus, 
  Users, 
  IdCard, 
  Contact, 
  Award, 
  LogOut,
  Building
} from "lucide-react";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [tenant, setTenant] = useState<TenantData | null>(null);

  useEffect(() => {
    const activeTenant = getTenantFromStorage();
    if (!activeTenant) {
      router.push("/login");
    } else {
      setTenant(activeTenant);
    }
  }, [router]);

  const handleLogout = async () => {
    await logoutTenant();
    router.push("/login");
  };

  if (!tenant) return null;

  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "1. Cadastro (Batismo)", href: "/cadastro", icon: UserPlus },
    { name: "2. Cadastro Geral", href: "/cadastro-geral", icon: Users },
    { name: "3. Credencial de Evento", href: "/credencial", icon: Contact },
    { name: "4. Carteira de Membro", href: "/carteira", icon: IdCard },
    { name: "5. Certificados", href: "/certificado", icon: Award },
  ];

  return (
    <div className="sidebar no-print">
      <div className="flex items-center gap-3 px-3 py-4 mb-4 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-md">
          {tenant.nome.substring(0, 2).toUpperCase()}
        </div>
        <div className="overflow-hidden">
          <h2 className="text-sm font-bold text-slate-100 truncate uppercase">{tenant.nome}</h2>
          <span className="text-xxs font-bold text-slate-400 tracking-wider uppercase block">Total Gestão</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? "active" : ""}`}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/5 pt-4">
        <button
          onClick={handleLogout}
          className="sidebar-link text-red-400 hover:text-red-300 hover:bg-red-950/20"
        >
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}
