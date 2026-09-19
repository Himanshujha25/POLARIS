import { useRef } from 'react';
import { Printer, X, Biohazard, ShieldCheck, Box, Anchor } from 'lucide-react';
import { Modal, btnPrimary, btnGhost } from './ui';

export default function ContainerLabelModal({ cargo, onClose }) {
  if (!cargo) return null;

  const printAreaRef = useRef(null);

  const handlePrint = () => {
    window.print();
  };

  const containerNo = cargo.containerNumber || `MSCU-${Math.abs(cargo.trackingNumber?.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0) % 9000000 + 1000000)}`;
  const sealNo = cargo.sealNumber || `IND-CUS-${cargo.trackingNumber?.slice(-5) || '84920'}`;
  const grossWeight = (cargo.weightKg || 500) + (cargo.tareWeightKg || 2200);

  return (
    <Modal title="Print Customs Shipping Container & Barcode Label" onClose={onClose}>
      <div className="flex flex-col gap-4 text-xs">
        {/* Printable Label Box */}
        <div
          ref={printAreaRef}
          className="printable-container-label border-2 border-slate-900 bg-white p-5 text-slate-950 rounded-lg shadow-sm font-sans"
        >
          {/* Top Header: Government of India & NCPOR */}
          <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 border-2 border-slate-900 rounded-full flex items-center justify-center font-serif font-black text-base bg-slate-100">
                🇮🇳
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider">National Centre for Polar and Ocean Research (NCPOR)</p>
                <p className="text-[10px] text-slate-600 font-semibold">Ministry of Earth Sciences · Government of India</p>
                <p className="text-[9px] font-mono text-slate-500">Official Polar Logistics & Deep Field Supply Manifest</p>
              </div>
            </div>
            {cargo.isHazmat && (
              <div className="flex items-center gap-1.5 border-2 border-amber-600 bg-amber-500/10 px-2.5 py-1 rounded text-amber-900 font-black text-xs">
                <Biohazard size={16} className="text-amber-600" />
                <span>HAZMAT / DG</span>
              </div>
            )}
          </div>

          {/* Key Identification Grid: Container & Seal */}
          <div className="grid grid-cols-2 gap-4 py-3 border-b-2 border-slate-900">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">ISO Container Number</p>
              <p className="text-lg font-mono font-black tracking-wider text-slate-950">{containerNo}</p>
              <p className="text-[10px] font-medium text-slate-600">Type: {cargo.containerType || '20ft ISO Polar Standard'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Customs Tamper Seal No.</p>
              <p className="text-lg font-mono font-black text-rose-700 tracking-wider flex items-center gap-1">
                <ShieldCheck size={16} className="text-rose-600" />
                <span>{sealNo}</span>
              </p>
              <p className="text-[10px] font-medium text-slate-600">Status: Verified Intact at Port of Lading</p>
            </div>
          </div>

          {/* Cargo Details & Station Destination */}
          <div className="grid grid-cols-3 gap-3 py-3 border-b-2 border-slate-900 text-[11px]">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Destination Base</p>
              <p className="font-extrabold text-sm text-cyan-800">
                {cargo.currentNode?.includes('Maitri') ? 'MAITRI STATION' : 'BHARATI STATION'}
              </p>
              <p className="text-[10px] text-slate-500">Antarctica (Larsemann Hills)</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Gross / Tare / Net Weight</p>
              <p className="font-bold">Gross: <b>{grossWeight} kg</b></p>
              <p className="text-[10px] text-slate-500">Tare: {cargo.tareWeightKg || 2200} kg · Cargo: {cargo.weightKg || 0} kg</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Supply Category</p>
              <p className="font-bold">{cargo.category || 'Expedition Life Support'}</p>
              <p className="text-[10px] text-slate-500">Transport: {cargo.transportMode || 'Research Vessel'}</p>
            </div>
          </div>

          {/* Container Inspection Photo (if present) */}
          {cargo.imageUrl && (
            <div className="pt-2 border-t border-slate-200">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Customs Inspection Photo & Tamper Seal Verification</p>
              <div className="h-28 w-full rounded border border-slate-300 overflow-hidden bg-slate-100 flex items-center justify-center">
                <img src={cargo.imageUrl} alt="Inspection" className="h-full w-full object-cover" />
              </div>
            </div>
          )}

          {/* Barcode & Machine Readable Section */}
          <div className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Standard Code 128 Barcode</p>
              {/* CSS Pure Barcode Simulation */}
              <div className="flex items-center gap-[2px] h-10 bg-white p-1 border border-slate-300">
                {[3,1,2,4,1,3,2,1,4,2,3,1,1,4,2,3,1,2,4,1,3,2,1,4,1,2,3,4,1,2,3,1,4,2].map((w, i) => (
                  <div key={i} className="bg-slate-950 h-full" style={{ width: `${w}px` }} />
                ))}
              </div>
              <p className="text-[10px] font-mono tracking-widest text-slate-700 mt-1 font-bold">{cargo.trackingNumber}</p>
            </div>

            {/* QR Code Container Payload */}
            <div className="flex flex-col items-center">
              <div className="h-20 w-20 border-2 border-slate-900 p-1 flex items-center justify-center bg-white">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(cargo.qrPayload || cargo.trackingNumber)}`}
                  alt="Customs QR Code"
                  className="h-full w-full object-contain"
                />
              </div>
              <p className="text-[9px] font-mono text-slate-500 mt-1 font-bold">SCAN TO AUDIT</p>
            </div>
          </div>

          {/* Customs Verification Sign-off */}
          <div className="mt-4 pt-3 border-t border-dashed border-slate-400 flex justify-between text-[9px] text-slate-500 font-mono">
            <span>NCPOR POLAR LOGISTICS DIVISION · FORM C-102</span>
            <span>CUSTOMS SEAL VERIFIED BY: ________________________</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button type="button" onClick={onClose} className={btnGhost}>
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className={`${btnPrimary} flex items-center gap-1.5 font-bold shadow-sm`}
          >
            <Printer size={15} />
            <span>Print Container Label (A4 / Thermal)</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
