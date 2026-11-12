CREATE UNIQUE INDEX "invoice_one_active_per_delivery" ON "Invoice"("deliveryId") WHERE status <> 'ANULADO';
