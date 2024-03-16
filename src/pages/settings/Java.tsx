import { useCallback, useEffect, useState } from "react";
import { useConfig } from "../../store/AuthContext";

export const Java = () => {

  const { JAVA_HOME, setJavaHome, memory: { freeRam, totalRam }, selectedRam, setSelectedRam } = useConfig();

  const calculateAccent = useCallback((x: number, set: (accent: string) => void) => {
    if (x <= freeRam / 2.8) return set('#22c55e');
    if (freeRam / 2.8 < x && x <= freeRam / 1.4) return set('#facc15');
    if (freeRam / 1.4 < x) return set('#dc2626');
  }, [freeRam]);

  useEffect(() => {
    calculateAccent(selectedRam.max, setAccentMax);
    calculateAccent(selectedRam.min, setAccentMin);
  }, [calculateAccent, selectedRam]);

  const [accentMax, setAccentMax] = useState<string>('#facc15');
  const [accentMin, setAccentMin] = useState<string>('#facc15');

  const handleChange = ({ target: { files } }: React.ChangeEvent<HTMLInputElement>) => {
    if (!files) return;

    setJavaHome(files[0].path);
  };


  return (
    <section className="flex-1 px-5 text-white">
      <article>
        <h2 className="text-4xl mb-5">RAM</h2>
        <hr />

        <div className="flex flex-col">
          <span>Max ram</span>
          <div className="flex gap-x-10 pr-10">
            <input
              style={{ accentColor: accentMax }}
              className="flex-1"
              type="range"
              min={1}
              max={freeRam}
              step={0.5}
              value={selectedRam.max}
              onChange={({ target: { value: max } }) => {
                const newMaxRam = Number(max);

                setSelectedRam({
                  min: newMaxRam < selectedRam.min ? newMaxRam : selectedRam.min,
                  max: Number(max)
                });
              }}
            />

            <strong className="text-2xl min-w-40">{selectedRam.max}G</strong>
          </div>
        </div>

        <div className="flex flex-col">
          <span>Min ram</span>
          <div className="flex gap-x-10 pr-10">
            <input
              style={{ accentColor: accentMin }}
              className="flex-1"
              type="range"
              min={1}
              max={freeRam}
              step={0.5}
              value={selectedRam.min}
              onChange={({ target: { value: min } }) => {
                const newMinRam = Number(min);

                setSelectedRam({
                  max: newMinRam > selectedRam.max ? newMinRam : selectedRam.max,
                  min: newMinRam
                });
              }}
            />
            <strong className="text-2xl min-w-40">{selectedRam.min}G</strong>
          </div>
        </div>

        <div className="flex flex-col">
          <span>Max ram: <b>{totalRam}Gb</b></span>
          <span>Free ram: <b>{freeRam}Gb</b></span>
        </div>
      </article>

      <article>
        <h2 className="text-4xl my-5">Java executable</h2>
        <hr />
        <div className="flex mt-10">
          <label
            className="text-sm text-nowrap p-2 text-gray-900 border border-gray-300 rounded-[8px_0px_0px_8px] cursor-pointer bg-gray-50 dark:text-white focus:outline-none dark:bg-gray-700 dark:border-gray-600 transition-shadow hover:shadow-white hover:shadow-[0px_1px_3px_1px]"
            htmlFor="file_input"
          >
            Change Java
          </label>

          <input
            type="file"
            id="file_input"
            onChange={handleChange}
            hidden
            accept=".exe"
            multiple={false}
          />
          <input
            className="w-full text-sm pl-2 text-gray-900 border border-gray-300 rounded-[0px_8px_8px_0px] bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
            value={JAVA_HOME}
            disabled
          />
        </div>
      </article>

    </section>
  );
};
