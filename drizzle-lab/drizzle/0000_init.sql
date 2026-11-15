CREATE TABLE "cliente" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"telefono" varchar(20),
	CONSTRAINT "cliente_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "pedido" (
	"id" serial PRIMARY KEY NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"estado" varchar(20) DEFAULT 'PENDIENTE' NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"cliente_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE cascade ON UPDATE no action;