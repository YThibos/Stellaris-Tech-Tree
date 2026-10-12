import { describe, expect, it } from 'vitest';
import { zipOf } from '../../tests/support/zip.ts';
import { readSaveResearch } from './save-research.ts';

const GAMESTATE = `version="Corvus v4.5.2"
player={
	{
		name="Captain"
		country=1
	}
}
country={
	0={
		name="Someone else"
		tech_status={
			technology="tech_not_mine"
			level=1
		}
	}
	1={
		name="United Nations of Earth"
		tech_status={
			technology="tech_lasers_1"
			level=1
			technology="tech_repeatable_weapon_type_energy_damage"
			level=4
			physics_queue={
				{
					progress=120
					technology="tech_queued_not_researched"
				}
			}
			alternatives={
				physics={ "tech_offered_not_researched" }
			}
		}
		flags={ "brace in a string }" }
	}
	2={
		tech_status={
			technology="tech_also_not_mine"
			level=1
		}
	}
}
`;

const META = 'version="Corvus v4.5.2"\nname="United Nations of Earth"\ndate="2312.04.01"\n';

describe('readSaveResearch', () => {
  it("reads the player empire's researched techs and repeatable levels, and nothing queued or offered", async () => {
    const stages: string[] = [];
    const research = await readSaveResearch(zipOf({ meta: META, gamestate: GAMESTATE }), (stage) =>
      stages.push(stage),
    );
    expect(research).toEqual({
      empireName: 'United Nations of Earth',
      date: '2312.04.01',
      researched: { tech_lasers_1: 1, tech_repeatable_weapon_type_energy_damage: 4 },
    });
    expect(stages).toEqual(['unpacking', 'reading']);
  });

  it('explains when a file is not a save', async () => {
    await expect(readSaveResearch(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow(
      'not a zip archive',
    );
  });

  it('explains when the save has no player empire', async () => {
    const save = zipOf({ meta: META, gamestate: 'version="x"\ncountry={\n}\n' });
    await expect(readSaveResearch(save)).rejects.toThrow(
      'could not be read because it has no player section',
    );
  });
});
