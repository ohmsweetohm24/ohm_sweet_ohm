"use client";

import React, { useEffect, useReducer } from "react";
import { ArrowLeft, MoreVertical, Save, CirclePlus } from "lucide-react";
import Topbar from "@/components/Topbar";
import ApplianceCardComponent from "@/components/ApplianceCardComponent";
import { useRouter } from "next/navigation";
import { Appliance } from "@/types/appliance";
import { createClient } from "@/utils/supabase/client";

type State = {
  isNewUser: boolean;
  appliances: Appliance[];
};

type Action =
  | { type: "SET_NEW_USER"; payload: boolean }
  | { type: "SET_APPLIANCES"; payload: Appliance[] }
  | { type: "DELETE_APPLIANCE"; payload: string };

const initialState: State = {
  isNewUser: true,
  appliances: [],
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_NEW_USER":
      return { ...state, isNewUser: action.payload };
    case "SET_APPLIANCES":
      return { ...state, appliances: action.payload };
    case "DELETE_APPLIANCE":
      return {
        ...state,
        appliances: state.appliances.filter(
          (appliance) => appliance.appliance !== action.payload
        ),
        isNewUser: state.appliances.length <= 1,
      };
    default:
      return state;
  }
}

const supabase = createClient();

async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.log(error);
    return null;
  }
  return data.user.id;
}

async function saveToSupabase(appliances: Appliance[]) {
  try {
    const userId = await getUser();
    if (!userId) return false;

    const fileName = `appliances_${Date.now()}.json`;
    const filePath = `${userId}/${fileName}`;

    // Convert appliances array to JSON string
    const jsonString = JSON.stringify(appliances);
    const blob = new Blob([jsonString], { type: "application/json" });

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from("oso_appliances")
      .upload(filePath, blob);

    if (error) {
      console.error("Error uploading to Supabase:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in saveToSupabase:", error);
    return false;
  }
}

async function getAppliances(): Promise<Appliance[]> {
  try {
    const userid = await getUser();
    if (!userid) return [];

    const userPath = `${userid}/`;
    const { data: fileList, error: listError } = await supabase.storage
      .from("oso_appliances")
      .list(userPath);

    if (listError || !fileList) {
      console.error("Error listing files:", listError);
      return [];
    }

    // Get the most recent JSON file
    const jsonFiles = fileList
      .filter((file) => file.name.endsWith(".json"))
      .sort((a, b) => {
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return timeB - timeA;
      });

    if (jsonFiles.length === 0) return [];

    // Download the most recent file
    const mostRecentFile = jsonFiles[0];
    const { data, error } = await supabase.storage
      .from("oso_appliances")
      .download(`${userid}/${mostRecentFile.name}`);

    if (error || !data) {
      console.error("Error downloading file:", error);
      return [];
    }

    const arrayBuffer = await data.arrayBuffer();
    const jsonString = new TextDecoder("utf-8").decode(arrayBuffer);
    const parsed = JSON.parse(jsonString);

    // Validate and return the appliances
    const appliances = Array.isArray(parsed) ? parsed : [parsed];
    return appliances.filter((item): item is Appliance => {
      const isValid =
        typeof item === "object" &&
        item !== null &&
        typeof item.appliance === "string" &&
        typeof item.powerUsage === "number" &&
        typeof item.brand === "string" &&
        typeof item.model === "string" &&
        typeof item.frequencyOfUse === "number" &&
        typeof item.numberOfAppliance === "number" &&
        typeof item.totalCost === "number";

      if (!isValid) {
        console.error("Invalid appliance data:", item);
      }
      return isValid;
    });
  } catch (error) {
    console.error("Error in getAppliances:", error);
    return [];
  }
}

const AddAppliancePage: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      // First try to get data from Supabase
      const appliancesData = await getAppliances();

      if (appliancesData.length > 0) {
        // Update local storage with the Supabase data
        localStorage.setItem("storedData", JSON.stringify(appliancesData));
        dispatch({ type: "SET_NEW_USER", payload: false });
        dispatch({ type: "SET_APPLIANCES", payload: appliancesData });
      } else {
        // If no Supabase data, try local storage as fallback
        const storedData = localStorage.getItem("storedData");
        if (storedData) {
          const parsedData: Appliance[] = JSON.parse(storedData);
          dispatch({ type: "SET_NEW_USER", payload: false });
          dispatch({ type: "SET_APPLIANCES", payload: parsedData });
        }
      }
    };

    loadData();
  }, []);

  const handleAddAppliance = () => {
    router.push("create/");
  };

  const handleCalculateBills = async () => {
    // Save to Supabase before calculating bills
    if (state.appliances.length > 0) {
      const saved = await saveToSupabase(state.appliances);
      if (!saved) {
        console.error("Failed to save appliances to Supabase");
        // You might want to show an error message to the user here
      }
    }
    router.push("estimate/results/");
  };

  const handleSave = async () => {
    if (state.appliances.length > 0) {
      const saved = await saveToSupabase(state.appliances);
      if (saved) {
        // You might want to show a success message to the user here
        console.log("Successfully saved to Supabase");
        alert("Saved Appliances!");
      } else {
        // You might want to show an error message to the user here
        console.error("Failed to save to Supabase");
        alert("Failed to save appliances, please try again");
      }
    }
  };

  const handleDeleteAppliance = (applianceName: string) => {
    dispatch({ type: "DELETE_APPLIANCE", payload: applianceName });

    // Update localStorage
    const storedData = localStorage.getItem("storedData");
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      const updatedData = parsedData.filter(
        (item: Appliance) => item.appliance !== applianceName
      );
      localStorage.setItem("storedData", JSON.stringify(updatedData));
    }
  };

  return (
    <div className="bg-white min-h-screen font-Montserrat">
      <Topbar />
      <div className="bg-dark-purple text-white p-4 flex items-center">
        <ArrowLeft className="mr-4" onClick={() => router.push("home/")} />
        <h1 className="text-lg font-montserrat flex-grow">Estimate bills</h1>
        <div className="flex">
          <Save className="mr-3" onClick={handleSave} />
          <MoreVertical />
        </div>
      </div>
      <div
        className="justify-center items-center flex text-dark-purple py-3 cursor-pointer"
        onClick={handleAddAppliance}
      >
        <CirclePlus />
        <div className="pl-1 font-semibold">Add Appliance</div>
      </div>
      {!state.isNewUser &&
        state.appliances.map((appliance, index) => (
          <div key={index} className="m-2 p-2 float-left">
            <ApplianceCardComponent
              applianceName={appliance.appliance}
              modelNumber={appliance.model}
              powerUsage={appliance.powerUsage}
              onDelete={() => handleDeleteAppliance(appliance.appliance)}
            />
          </div>
        ))}

      <div className="text-dark-purple font-normal text-sm mx-4">
        Calculation is based on 30days/month and tariff rates of $0.31/kWh,
        based on rates in Jul – Sep 2024. Tariff rates are updated every
        quarter.
      </div>
      <div className="pt-5 pb-3 justify-center flex items-center">
        <button
          className="border bg-dark-purple py-1.5 rounded-full w-11/12 text-white"
          onClick={handleCalculateBills}
        >
          Calculate Bills
        </button>
      </div>
    </div>
  );
};

export default AddAppliancePage;
