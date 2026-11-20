#include "TibetQASubsystem.h"
#include "TibetBossHalo.h"
#include "TibetGameMode.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "EngineUtils.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"
#include "UnrealClient.h"

bool UTibetQASubsystem::CaptureEncounter(APlayerController& PC, ATibetGameMode& Mode)
{
    const FName Kind = Mode.GetObjectiveKind();
    TArray<AActor*> Pack;
    UGameplayStatics::GetAllActorsWithTag(GetWorld(),TEXT("TibetWildEnemy"),Pack);
    TArray<AActor*> Halos;
    UGameplayStatics::GetAllActorsOfClass(GetWorld(),ATibetBossHalo::StaticClass(),Halos);
    if (Kind != TEXT("Combat") && Kind != TEXT("Boss"))
    {
        if (Pack.Num() || Halos.Num()) { Finish(false,TEXT("Encounter actors survived the fight")); return true; }
        return false;
    }
    const bool Boss = Kind == TEXT("Boss");
    if (SeenEncounters.IsEmpty())
    {
        TSet<FName> Models;
        for (AActor* Actor : Pack)
        {
            const auto* Mesh = Actor->FindComponentByClass<UStaticMeshComponent>();
            if (Mesh && Mesh->GetStaticMesh() && Mesh->IsVisible() && !Actor->IsHidden())
                Models.Add(Mesh->GetStaticMesh()->GetFName());
        }
        Record(FString::Printf(TEXT("pack\t%d\t%d\t%d"),Mode.GetStepProgress(),Models.Num(),Pack.Num()));
    }
    AActor* Target = nullptr;
    if (Boss && Halos.Num()==1) Target=Halos[0]->GetOwner();
    if (!Boss) for (AActor* A : Pack)
        if (A->GetActorLocation().Equals(Mode.GetObjectiveLocation(),2.)) { Target=A; break; }
    if (!Target || Halos.Num()!=(Boss?1:0) || (Boss && Pack.Num()!=0))
    { Finish(false,TEXT("Encounter target and visible halo do not match")); return true; }
    const auto* Body=Target->FindComponentByClass<UStaticMeshComponent>();
    if (!Body || !Body->GetStaticMesh() || !Body->IsVisible()) { Finish(false,TEXT("Missing encounter mesh")); return true; }
    const FName Model=Body->GetStaticMesh()->GetFName();
    if (SeenEncounters.Contains(Model)) return false;
    SeenEncounters.Add(Model);
    if (Boss)
    {
        const AActor* Halo=Halos[0];
        if (Halo->GetAttachParentActor()!=Target || FVector::Dist2D(Halo->GetActorLocation(),Target->GetActorLocation())>4)
        { Finish(false,TEXT("Boss halo must follow its living owner")); return true; }
        for (int32 I=0; I<32; ++I)
        {
            const float A=UE_TWO_PI*I/32;
            FVector2D Pixel;
            if (PC.ProjectWorldLocationToScreen(Halo->GetActorLocation()+FVector(132*FMath::Cos(A),132*FMath::Sin(A),0),Pixel,true))
                Record(FString::Printf(TEXT("rim\t%.1f\t%.1f"),Pixel.X,Pixel.Y));
        }
    }
    Record(TEXT("opponent\t")+Model.ToString());
    FScreenshotRequest::RequestScreenshot(Output/(Model.ToString()+TEXT(".png")),true,false,false);
    return true;
}
