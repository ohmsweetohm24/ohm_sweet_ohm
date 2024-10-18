"use client";

import React, { useEffect, useReducer } from "react";
import { ArrowLeft, Camera } from "lucide-react";
import Topbar from "@/components/Topbar";
import { useRouter } from "next/navigation";
import {Appliance} from "@/types/appliance";

type PowerUsageType = "watts" | "kiloWatts" | "voltage_current";

type State = {
  formData: Appliance;
  power_usageType: PowerUsageType;
  voltage: number | undefined;
  current: number | undefined;
  loading: boolean;
  localData: Appliance[];
};

type Action =
    | { type: "SET_FORM_DATA"; payload: Partial<Appliance> }
    | { type: "SET_POWER_USAGE_TYPE"; payload: PowerUsageType }
    | { type: "SET_VOLTAGE"; payload: number | undefined }
    | { type: "SET_CURRENT"; payload: number | undefined }
    | { type: "SET_LOADING"; payload: boolean }
    | { type: "SET_LOCAL_DATA"; payload: Appliance[] }
    | { type: "ADD_APPLIANCES"; payload: Appliance[] };

const initialState: State = {
  formData: {
    appliance: "",
    powerUsage: 0,
    brand: "",
    model: "",
    frequencyOfUse: 1,
    numberOfAppliance: 1,
    totalCost: 0,
  },
  power_usageType: "watts",
  voltage: undefined,
  current: undefined,
  loading: false,
  localData: [],
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_FORM_DATA":
      return { ...state, formData: { ...state.formData, ...action.payload } };
    case "SET_POWER_USAGE_TYPE":
      return { ...state, power_usageType: action.payload };
    case "SET_VOLTAGE":
      return { ...state, voltage: action.payload };
    case "SET_CURRENT":
      return { ...state, current: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_LOCAL_DATA":
      return { ...state, localData: action.payload };
    case "ADD_APPLIANCES":
      return { ...state, localData: [...state.localData, ...action.payload] };
    default:
      return state;
  }
}

const CreateAppliancePage: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const router = useRouter();

  useEffect(() => {
    const data = localStorage.getItem("storedData");
    if (data) {
      const parsedData = JSON.parse(data);
      dispatch({type: "SET_LOCAL_DATA", payload: parsedData});
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {name, value} = e.target;
    dispatch({type: "SET_FORM_DATA", payload: {[name]: value}});
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      dispatch({type: "SET_LOADING", payload: true});

      // Log file details
      selectedFiles.forEach((file, index) => {
        console.log(`File ${index + 1}:`, {
          name: file.name,
          type: file.type,
          size: `${file.size} bytes`
        });
      });

      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("images", file);
      });



      // Synchronous XMLHttpRequest
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/scan", false);  // false makes it synchronous
      xhr.onload = function() {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          if (Array.isArray(data)) {
            const newAppliances = data.map((item) => ({
              appliance: item.appliance || "Unidentified",
              brand: item.brand || "Unidentified",
              model: item.model || "Unidentified",
              powerUsage: item.power_usage || 0,
              frequencyOfUse: 1,
              numberOfAppliance: 1,
              totalCost: 0,
            }));

            dispatch({type: "ADD_APPLIANCES", payload: newAppliances});

            if (newAppliances.length > 0) {
              dispatch({type: "SET_FORM_DATA", payload: newAppliances[0]});
            }

            const updatedData = [...state.localData, ...newAppliances];
            localStorage.setItem("storedData", JSON.stringify(updatedData));
          } else {
            alert("Could not extract data from the image(s).");
          }
        } else {
          console.error("Error scanning the label(s):", xhr.statusText);
          alert("An error occurred while scanning the label(s).");
        }
        dispatch({type: "SET_LOADING", payload: false});
        router.push('./estimate');
      };
      xhr.onerror = function() {
        console.error("Network error occurred");
        alert("A network error occurred. Please try again.");
        dispatch({type: "SET_LOADING", payload: false});
      };
      xhr.send(formData);
    }
  };
  const handleSubmit = () => {
    const updatedFormData = {...state.formData};

    if (state.power_usageType === "watts") {
      updatedFormData.powerUsage = Number(state.formData.powerUsage) / 1000;
    } else if (state.power_usageType === "voltage_current") {
      updatedFormData.powerUsage = ((state.voltage ?? 0) * (state.current ?? 0)) / 1000;
    }

    const dataToSave = [...state.localData, updatedFormData];
    localStorage.setItem("storedData", JSON.stringify(dataToSave));

    router.push("./estimate");
  };

  return (
      <div className="font-montserrat bg-white min-h-screen">
        <Topbar/>
        <div className="bg-dark-purple text-white p-4 flex items-center justify-between">
          <div className="flex items-center">
            <ArrowLeft className="mr-4" onClick={() => router.back()}/>
            <h1 className="text-lg font-montserrat flex-grow">
              Enter Product Details
            </h1>
          </div>
          <button
              className="text-sm"
              type="button"
              onClick={handleSubmit}
          >
            Next
          </button>
        </div>

        <div className="p-4 space-y-4">
          <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              id="file-input"
              style={{display: "none"}}
          />

          <button
              className="w-full py-3 px-4 border border-purple-900 rounded-md flex items-center justify-center text-dark-purple"
              onClick={() => document.getElementById("file-input")?.click()}
          >
            <Camera className="mr-2"/>
            {state.loading ? "Scanning..." : "Scan Appliance"}
          </button>

          <div className="space-y-4">
            <div className="border border-gray-300 rounded-md p-3 mb-4">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700">
                    Appliance
                  </label>
                  <span className="text-xs text-gray-500">
                (e.g. Kettle 1.5L)
              </span>
                </div>
                <input
                    type="text"
                    name="appliance"
                    placeholder="Describe Appliance"
                    className="text-right text-dark-purple placeholder-dark-purple focus:outline-none"
                    value={state.formData.appliance}
                    onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="border border-gray-300 rounded-md p-3 mb-4">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700">
                    Power Usage
                  </label>
                  <select
                      className="text-xs text-gray-500 mt-1"
                      value={state.power_usageType}
                      onChange={(e) => dispatch({
                        type: "SET_POWER_USAGE_TYPE",
                        payload: e.target.value as PowerUsageType
                      })}
                  >
                    <option value="watts">Watts (W)</option>
                    <option value="kiloWatts">kiloWatts (kW)</option>
                    <option value="voltage_current">
                      Voltage (V) + Current (A)
                    </option>
                  </select>
                </div>
                {state.power_usageType === "watts" || state.power_usageType === "kiloWatts" ? (
                    <input
                        type="text"
                        name="powerUsage"
                        placeholder={state.power_usageType === "watts" ? "Enter Watts" : "Enter kiloWatts"}
                        className="text-right text-dark-purple placeholder-dark-purple focus:outline-none"
                        value={state.formData.powerUsage}
                        onChange={handleInputChange}
                    />
                ) : (
                    <div className="flex flex-col">
                      <input
                          type="number"
                          name="voltage"
                          placeholder="Enter Volts"
                          className="text-right text-dark-purple placeholder-dark-purple focus:outline-none"
                          value={state.voltage}
                          onChange={(e) => dispatch({type: "SET_VOLTAGE", payload: Number(e.target.value)})}
                      />
                      <input
                          type="number"
                          name="current"
                          placeholder="Enter Amps"
                          className="text-right text-dark-purple placeholder-dark-purple focus:outline-none"
                          value={state.current}
                          onChange={(e) => dispatch({type: "SET_CURRENT", payload: Number(e.target.value)})}
                      />
                    </div>
                )}
              </div>
            </div>

            <div className="border border-gray-300 rounded-md p-3 mb-4">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700">
                    Brand Name
                  </label>
                </div>
                <input
                    type="text"
                    name="brand"
                    placeholder="Optional"
                    className="text-right text-dark-purple placeholder-dark-purple focus:outline-none"
                    value={state.formData.brand}
                    onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="border border-gray-300 rounded-md p-3 mb-4">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700">
                    Model
                  </label>
                </div>
                <input
                    type="text"
                    name="model"
                    placeholder="Optional"
                    className="text-right text-dark-purple placeholder-dark-purple focus:outline-none"
                    value={state.formData.model}
                    onChange={handleInputChange}
                />
              </div>
            </div>
          </div>
        </div>
      </div>);
};
export default CreateAppliancePage;