import ItemType from "../../domain/entity/ItemType";
import ItemTypeRepository from "../../domain/repository/ItemTypeRepository";
import Connection from "../database/Connection";

export default class ItemTypeRepositoryDatabase implements ItemTypeRepository {
  constructor(readonly connection: Connection) {}

  async list(): Promise<ItemType[]> {
    const data = await this.connection.query<ItemType[]>(
      `SELECT *, description as label from phd.item_type WHERE active = $1`,
      [true]
    );
    return data;
  }

  async create(data: ItemType): Promise<void> {
    await this.connection.query(
      "INSERT INTO phd.item_type (description, active, id_parent) VALUES ($1, $2, $3)",
      [data.description, data.active, data.idParent]
    );
  }

  async update(data: ItemType): Promise<void> {
    await this.connection.query(
      "UPDATE phd.item_type SET description = $1, active = $2, id_parent = $3  WHERE id = $4",
      [data.description, data.active, data.idParent, data.id]
    );
  }

  async inAndOut(
    year: number
  ): Promise<{ description: string; spent: number; earn: number }[]> {
    const data = await this.connection.query<
      { description: string; spent: number; earn: number }[]
    >(
      "SELECT type.description, " +
        "COALESCE(SUM((SELECT SUM(item.value) " +
        "FROM phd.planning_month_item item " +
        "INNER JOIN phd.planning_month pm ON item.id_month_planning = pm.id " +
        "INNER JOIN phd.planning p ON pm.id_planning = p.id " +
        "WHERE item.id_type = type.id " +
        "AND item.operation = 'out' " +
        `AND p.year = ${year})), 0) AS spent, ` +
        "COALESCE(SUM((SELECT SUM(item.value) " +
        "FROM phd.planning_month_item item " +
        "INNER JOIN phd.planning_month pm ON item.id_month_planning = pm.id " +
        "INNER JOIN phd.planning p ON pm.id_planning = p.id " +
        "WHERE item.id_type = type.id " +
        " AND item.operation = 'in' " +
        `AND p.year = ${year})), 0) AS earn ` +
        "FROM phd.item_type type " +
        "GROUP BY type.id " +
        "ORDER BY type.description;",
      []
    );
    return data;
  }

  async outWithItems(year: number): Promise<any> {
    const data = await this.connection.query(
      `
                SELECT type.description,
                ARRAY((SELECT JSON_BUILD_OBJECT('value', item.value, 'description', item.description)
                      FROM phd.planning_month_item item
                                INNER JOIN phd.planning_month pM ON pM.id = item.id_month_planning
                                INNER JOIN phd.planning p ON p.id = pM.id_planning and p.year = $1
                      WHERE item.id_type = type.id
                        AND item.operation = 'out')) values
          FROM phd.item_type type
          GROUP BY type.id
                
      `,
      [year]
    );

    return data;
  }
}
