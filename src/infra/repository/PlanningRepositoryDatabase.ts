import { pl } from "date-fns/locale";
import Planning from "../../domain/entity/Planning";
import PlanningMonth from "../../domain/entity/PlanningMonth";
import PlanningRepository, {  PlanningDatabase } from "../../domain/repository/PlanningRepository";
import Connection from "../database/Connection";
import { getSetByKeysValues, getSetForCteByKeys } from "../helpers/DbHelper";
import BaseRepositoryDatabase from "./BaseRepositoryDatabase";

export default class PlanningRepositoryDatabase  extends BaseRepositoryDatabase implements PlanningRepository {
    constructor(readonly connection: Connection) {
        super(connection)
    }

    async save(planning: Planning): Promise<void> {
        try {
        await this.beginTransaction()
        const [{id: idPlanning}] = await this.connection.query<[{id: number}]>("INSERT INTO phd.planning (year, status, title, expected_amount, balance, start_at, end_at) VALUES ($1, $2, $3, $4, $5, $6, $7) returning id", 
            [
                planning.year,
                planning.status,
                planning.title,
                planning.expectedAmount,
                planning.balance,
                planning.startAt,
                planning.endAt
            ])
        if (planning.getMonths().length) {
            for (const month of planning.getMonths()) {
                const [{ id: idMonthPlanning }] = await this.connection.query<[{id: number}]>("INSERT INTO phd.planning_month (id_month, id_planning, balance, expected_amount, total_in, total_out, spent_on_debit, spent_on_credit) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) returning id", [month.idMonth, idPlanning,  month.balance, month.expectedAmount, month.totalIn, month.totalOut, month.spentOnDebit, month.spentOnCredit])
                if (month.getItens().length) {
                    for (const monthItem of month.getItens()) {
                        await this.connection.query("INSERT INTO phd.planning_month_item (id_month_planning, value, description, idType ,operation, date, payment_method) VALUES ($1, $2, $3, $4, $5, $6, $7)", [idMonthPlanning, monthItem.value, monthItem.description, monthItem.idType, monthItem.operation, monthItem.date, monthItem.paymentMethod])
                    }
                }
            }
        }
        await this.commitTransaction()
    } catch (e: any) {
        await this.rollbackTransaction()
        throw e
    }
    }

    async getByYear(year: number): Promise<Planning  | void > {
        const data = await this.connection.query<PlanningDatabase[]>(
        "SELECT PLANNING.*," +
            " (SELECT JSONB_AGG(T) RES"
        +    " FROM (SELECT PLANNING_MONTH.*, JSON_AGG(PLANNING_MONTH_ITEM.*) AS ITEMS" +
                    " FROM PHD.PLANNING_MONTH PLANNING_MONTH" +
                        " INNER JOIN PHD.PLANNING_MONTH_ITEM PLANNING_MONTH_ITEM ON PLANNING_MONTH_ITEM.ID_MONTH_PLANNING = PLANNING_MONTH.ID" + 
                            " WHERE PLANNING_MONTH.ID_PLANNING = PLANNING.ID" +
                            " GROUP BY PLANNING_MONTH.ID) T) AS MONTHS" + 
            " FROM PHD.PLANNING PLANNING WHERE PLANNING.YEAR = $1 GROUP BY PLANNING.ID;", [year])
        if (data.length) {
            const [planningDatabase] = data
            const planning = new Planning(planningDatabase.year, planningDatabase.status, planningDatabase.title, parseFloat(planningDatabase.expected_amount), planningDatabase.start_at, planningDatabase.end_at, planningDatabase.id)
            
            if (planningDatabase.months?.length) {
                for (const month of planningDatabase.months) {
                    const planningMonth = new PlanningMonth(planningDatabase.id, parseFloat(month.expected_amount),parseFloat(month.spent_on_debit), parseFloat(month.spent_on_debit), parseFloat(month.total_in), parseFloat(month.total_out), month.open ,month.id)
                    if (month.items?.length) {
                        for (const item of month.items)
                        /** @ts-ignore */
                        planningMonth.addItem(parseFloat(item.value), item.operation.trim(), item.date, item.description, item.payment_method,  item.id)
                    }
                    planning.addMonth(planningMonth)
                }
            }
            return planning
        } 
    }

    async update(planning: Planning) {
        const keys: (keyof Planning)[] = ["balance", "expectedAmount", "startAt", "title", "endAt"] 
        const setString = getSetByKeysValues(planning, keys)
        await this.connection.query(`UPDATE phd.planning ${setString} WHERE id = $1`, [planning.id])
    }

}