"use client";
import React, { useEffect, useState } from "react";
import { ArrowLeft, MoreVertical, Share2 } from "lucide-react";
import Topbar from "@/components/Topbar";
import Infographic from "@/app/estimate/results/Infographic";
import Breakdown from "@/app/estimate/results/Breakdown";
import { useRouter } from "next/navigation";
import { Appliance } from "@/types/appliance";

type Views = {
  [key: string]: string[];
};

const EstimateResults: React.FC = () => {
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [views, setViews] = useState<Views>({});
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchApplianceData();
      } catch (error) {
        console.error("Error in loadData:", error);
      }
    };

    loadData();
  }, []);

  const fetchApplianceData = async () => {
    const storedData = localStorage.getItem("storedData");
    if (!storedData) {
      console.log("No stored data found");
      return;
    }

    try {
      const parsedData: Appliance[] = JSON.parse(storedData);
      console.log("Parsed data from localStorage:", parsedData);

      // Update state with localStorage data immediately
      setAppliances(parsedData);
      const localTotal = parsedData.reduce((sum, appliance) => sum + appliance.totalCost, 0);
      setTotalCost(localTotal);

      // Then fetch updated data from the server
      const response = await fetch("/api/getNationalMonthlyAverage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const updatedData: Appliance[] = await response.json();
      console.log("Updated data from getNationalMonthlyAverage:", updatedData);
      setAppliances(updatedData);

      const total = updatedData.reduce((sum, appliance) => sum + appliance.totalCost, 0);
      console.log("Calculated total cost:", total);
      setTotalCost(total);
      localStorage.setItem("storedData", JSON.stringify(updatedData));

      const suggestionsResponse = await fetch("/api/getSuggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });

      if (!suggestionsResponse.ok) {
        throw new Error(`HTTP error! Status: ${suggestionsResponse.status}`);
      }

      const suggestionsViews: Views = await suggestionsResponse.json();
      console.log("Suggestions views:", suggestionsViews);
      setViews(suggestionsViews);

    } catch (error) {
      console.error("Error updating appliance data:", error);
    }
  };

  return (
      <div className="bg-white min-h-screen font-Montserrat">
        <Topbar />
        <div className="bg-dark-purple text-white p-4 flex items-center">
          <ArrowLeft className="mr-4" onClick={() => router.push("/estimate")} />
          <h1 className="text-lg font-montserrat flex-grow">
            Estimate bills - Results
          </h1>
          <div className="flex">
            <Share2 className="mr-3" />
            <MoreVertical />
          </div>
        </div>
        <div className="m-2 p-2 float-left items-center justify-center">
          <Infographic totalCost={totalCost} appliances={appliances} views={views}/>
        </div>
        <div className="m-2 p-2 float-left items-center justify-center">
          <Breakdown totalCost={totalCost} appliances={appliances} />
        </div>
      </div>
  );
};

export default EstimateResults;