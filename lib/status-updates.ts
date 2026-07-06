export type ServiceStatus = "operational" | "degraded" | "maintenance" | "incident";

export type StatusComponent = {
  name: string;
  description: string;
  status: ServiceStatus;
};

export type StatusUpdate = {
  at: string;
  title: string;
  body: string;
  tone: "info" | "success" | "warning" | "error";
};

export type StatusIncident = {
  id: string;
  title: string;
  status: "resolved" | "monitoring" | "investigating" | "scheduled";
  startedAt: string;
  resolvedAt?: string;
  updates: StatusUpdate[];
};

export const statusUpdatedAt = "2026-07-01T12:00:00+03:00";

export const statusComponents: StatusComponent[] = [
  {
    name: "Dashboard",
    description: "QR listeleme, klasörler, rapor kartları ve yönetim paneli",
    status: "operational",
  },
  {
    name: "QR Redirect",
    description: "Public QR tarama ve yönlendirme akışları",
    status: "operational",
  },
  {
    name: "Analytics",
    description: "Tarama kayıtları, grafikler, CSV ve Excel dışa aktarma",
    status: "operational",
  },
  {
    name: "Billing",
    description: "Abonelik, ödeme doğrulama ve müşteri portalı",
    status: "operational",
  },
  {
    name: "Notifications",
    description: "E-posta, SMS, WhatsApp ve webhook bildirimleri",
    status: "operational",
  },
];

export const statusIncidents: StatusIncident[] = [
  {
    id: "dashboard-data-load-hardening-2026-07-01",
    title: "Dashboard veri yükleme akışı güçlendirildi",
    status: "resolved",
    startedAt: "2026-07-01T10:20:00+03:00",
    resolvedAt: "2026-07-01T11:45:00+03:00",
    updates: [
      {
        at: "2026-07-01T11:45:00+03:00",
        title: "Çözüldü",
        body: "Dashboard ana yüklemesi, yardımcı veriler veya geriye dönük şema farkları nedeniyle tamamen kesilmeyecek şekilde güncellendi.",
        tone: "success",
      },
      {
        at: "2026-07-01T11:10:00+03:00",
        title: "Koruma eklendi",
        body: "QR listeleme ve istatistik endpointleri eski migration durumlarında daha güvenli fallback kullanacak şekilde düzenlendi.",
        tone: "info",
      },
      {
        at: "2026-07-01T10:20:00+03:00",
        title: "İnceleme başladı",
        body: "Bazı dashboard veri çağrılarında kullanıcıya genel veri yükleme hatası gösterilebildiği tespit edildi.",
        tone: "warning",
      },
    ],
  },
  {
    id: "reports-export-2026-07-01",
    title: "Rapor dışa aktarma seçenekleri genişletildi",
    status: "resolved",
    startedAt: "2026-07-01T09:15:00+03:00",
    resolvedAt: "2026-07-01T09:40:00+03:00",
    updates: [
      {
        at: "2026-07-01T09:40:00+03:00",
        title: "Yayında",
        body: "Tarama raporlarında CSV indirme yanında Excel indirme seçeneği de aktif edildi.",
        tone: "success",
      },
    ],
  },
];
