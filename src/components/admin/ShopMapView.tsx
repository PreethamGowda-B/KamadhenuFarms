'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Users,
  Filter,
  RefreshCw,
  Phone,
  MessageSquare,
  ExternalLink,
  Layers,
  Sparkles,
  ShoppingBag
} from 'lucide-react';

interface MapShop {
  id: string;
  shopCode: string;
  shopName: string;
  ownerName: string;
  mobile: string;
  whatsapp?: string;
  address: string;
  area: string;
  city: string;
  latitude: number;
  longitude: number;
  shopType: string;
  status: string;
  responseStatus: string;
  potential: string;
  totalOrders: number;
  totalPurchaseValue: number;
  outstandingAmount: number;
  reorderStatus: 'REORDERED' | 'DUE_SOON' | 'DUE_TODAY' | 'OVERDUE' | 'NO_ORDERS';
  salespersonName: string;
  salespersonId?: string;
}

export default function ShopMapView({ salesExecutives = [] }: { salesExecutives?: any[] }) {
  const [shops, setShops] = useState<MapShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExec, setSelectedExec] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedShop, setSelectedShop] = useState<MapShop | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

  // Fetch geo data
  useEffect(() => {
    fetchMapData();
  }, [selectedExec, selectedStatus]);

  async function fetchMapData() {
    try {
      setLoading(true);
      const url = `/api/shops/map?salespersonId=${selectedExec}&status=${selectedStatus}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.shops)) {
        setShops(data.shops);
      }
    } catch (e) {
      console.error('Error loading map shops:', e);
    } finally {
      setLoading(false);
    }
  }

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let L: any;
    import('leaflet').then((leafletModule) => {
      L = leafletModule.default || leafletModule;

      // Import leaflet CSS dynamically if not present
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!leafletMapRef.current && mapContainerRef.current) {
        // Center on Karnataka (approx Bangalore coords)
        const map = L.map(mapContainerRef.current).setView([12.9716, 77.5946], 7);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);

        leafletMapRef.current = map;
        markersLayerRef.current = L.layerGroup().addTo(map);
      }

      // Re-render markers
      if (markersLayerRef.current && leafletMapRef.current) {
        markersLayerRef.current.clearLayers();

        const bounds = L.latLngBounds([]);
        let validCoordsCount = 0;

        shops.forEach((shop) => {
          if (!shop.latitude || !shop.longitude) return;

          // Color selection based on reorder/potential status
          let markerColor = '#16a34a'; // Green (Active/Reordered)
          let label = '🟢 Active';
          if (shop.reorderStatus === 'OVERDUE') {
            markerColor = '#dc2626'; // Red
            label = '🔴 Reorder Overdue';
          } else if (shop.reorderStatus === 'DUE_TODAY' || shop.reorderStatus === 'DUE_SOON') {
            markerColor = '#eab308'; // Yellow
            label = '🟡 Due Soon';
          } else if (shop.potential === 'HIGH') {
            markerColor = '#9333ea'; // Purple
            label = '🟣 High Potential';
          }

          const customIcon = L.divIcon({
            className: 'custom-map-pin',
            html: `
              <div style="
                background-color: ${markerColor};
                width: 28px;
                height: 28px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 11px;
                cursor: pointer;
                transform: translate(-50%, -50%);
              ">
                🍯
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          const marker = L.marker([shop.latitude, shop.longitude], { icon: customIcon });

          const popupContent = `
            <div style="font-family: sans-serif; padding: 4px; max-width: 220px;">
              <div style="font-size: 10px; font-weight: bold; color: #92400e; text-transform: uppercase;">${shop.shopCode}</div>
              <div style="font-size: 14px; font-weight: bold; color: #1c1917; margin: 2px 0;">${shop.shopName}</div>
              <div style="font-size: 11px; color: #57534e;">Owner: ${shop.ownerName} • ${shop.mobile}</div>
              <div style="font-size: 11px; color: #57534e; margin-bottom: 6px;">Area: ${shop.area}, ${shop.city}</div>
              <div style="font-size: 11px; font-weight: 600; color: ${markerColor}; margin-bottom: 6px;">${label}</div>
              <div style="font-size: 11px; color: #065f46; font-weight: bold;">Sales: ₹${shop.totalPurchaseValue.toLocaleString('en-IN')} (${shop.totalOrders} orders)</div>
              <div style="font-size: 10px; color: #78716c; margin-top: 4px;">Executive: ${shop.salespersonName}</div>
              <div style="margin-top: 8px; display: flex; gap: 4px;">
                <a href="tel:${shop.mobile}" style="background: #16a34a; color: white; padding: 4px 8px; border-radius: 6px; text-decoration: none; font-size: 10px; font-weight: bold;">Call</a>
                <a href="https://wa.me/91${shop.mobile.replace(/[^0-9]/g, '')}" target="_blank" style="background: #059669; color: white; padding: 4px 8px; border-radius: 6px; text-decoration: none; font-size: 10px; font-weight: bold;">WhatsApp</a>
                <a href="/admin/shops/${shop.id}" style="background: #92400e; color: white; padding: 4px 8px; border-radius: 6px; text-decoration: none; font-size: 10px; font-weight: bold;">Profile</a>
              </div>
            </div>
          `;

          marker.bindPopup(popupContent);
          marker.on('click', () => setSelectedShop(shop));
          markersLayerRef.current.addLayer(marker);

          bounds.extend([shop.latitude, shop.longitude]);
          validCoordsCount++;
        });

        if (validCoordsCount > 0) {
          leafletMapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        }
      }
    });
  }, [shops]);

  return (
    <div className="space-y-4">
      {/* Map Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
            <MapPin className="w-4 h-4 text-amber-700" />
            <span>Salesperson Territory Filter:</span>
          </div>

          <select
            value={selectedExec}
            onChange={(e) => setSelectedExec(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-bold bg-white"
          >
            <option value="ALL">All Sales Executives</option>
            {salesExecutives.map((exec) => (
              <option key={exec.id} value={exec.id}>
                {exec.fullName} ({exec.applicationNo})
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-bold bg-white"
          >
            <option value="ALL">All Shop Statuses</option>
            <option value="ACTIVE">Active Shops</option>
            <option value="ORDER_CONFIRMED">Order Confirmed</option>
            <option value="FOLLOW_UP_DUE">Follow-up Due</option>
          </select>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Reordered / Active
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span> Due Soon
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span> Overdue
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span> High Potential
          </span>
        </div>
      </div>

      {/* Map Frame */}
      <div className="relative rounded-2xl overflow-hidden border border-stone-300 shadow-md bg-stone-100 h-[600px]">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs z-10 flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-700 mx-auto mb-2" />
              <span className="text-xs font-bold text-stone-700">Plotting shop coordinates…</span>
            </div>
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
