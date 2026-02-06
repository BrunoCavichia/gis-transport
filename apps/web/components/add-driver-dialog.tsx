"use client";

import { useState } from "react";
import { Driver } from "@gis/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, UserPlus, ShieldPlus } from "lucide-react";

interface AddDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (driver: Partial<Driver>) => Promise<void>;
  isLoading?: boolean;
}

export function AddDriverDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: AddDriverDialogProps) {
  const [name, setName] = useState("");
  const [licenseType, setLicenseType] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      await onSubmit({
        name: name.trim(),
        licenseType: licenseType.trim() || undefined,
        licenseNumber: licenseNumber.trim() || undefined,
        phoneNumber: phoneNumber.trim(),
        imageUrl: imagePreview || undefined,
      });
      setName("");
      setLicenseType("");
      setLicenseNumber("");
      setPhoneNumber("");
      setImageFile(null);
      setImagePreview("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-none shadow-2xl bg-background/95 backdrop-blur-xl">
        <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-primary/10 rounded-xl">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  Alta de Conductor
                </DialogTitle>
                <DialogDescription className="text-xs uppercase tracking-widest font-bold text-muted-foreground/60">
                  Registro de Personal
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="driver-name" className="text-xs font-semibold">
                Nombre Completo
              </Label>
              <Input
                id="driver-name"
                placeholder="Ej: Juan Pérez..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 bg-muted/30 border-border/50 focus:bg-background transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="license-type" className="text-xs font-semibold">
                  Tipo de Licencia
                </Label>
                <Input
                  id="license-type"
                  placeholder="Ej: B, C1..."
                  value={licenseType}
                  onChange={(e) => setLicenseType(e.target.value)}
                  className="h-11 bg-muted/30 border-border/50 focus:bg-background transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="license-number"
                  className="text-xs font-semibold"
                >
                  Nº Permiso
                </Label>
                <Input
                  id="license-number"
                  placeholder="Ej: 1234567..."
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="h-11 bg-muted/30 border-border/50 focus:bg-background transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone-number" className="text-xs font-semibold">
                Número de Teléfono
              </Label>
              <Input
                id="phone-number"
                placeholder="Ej: +34 600 123 456..."
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="h-11 bg-muted/30 border-border/50 focus:bg-background transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image-file" className="text-xs font-semibold">
                Foto del Conductor (Opcional)
              </Label>
              <div className="flex items-center gap-3">
                {imagePreview && (
                  <div className="h-16 w-16 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <Input
                  id="image-file"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="h-11 bg-muted/30 border-border/50 focus:bg-background transition-all cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center shadow-sm">
                <ShieldPlus className="h-5 w-5 text-primary/70" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 leading-none">
                  Estado Inicial
                </p>
                <p className="text-xs font-bold text-foreground/80">
                  Disponible para Asignación
                </p>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !name.trim()}
                className="font-bold shadow-lg shadow-primary/20 text-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                    Registrando...
                  </>
                ) : (
                  "Registrar Conductor"
                )}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
