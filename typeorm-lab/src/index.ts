import { DataSource } from "typeorm";


const ds = new DataSource({
    ype: "postgres",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [Cliente, Pedido],
    synchronize: true,
    logging: true,
});