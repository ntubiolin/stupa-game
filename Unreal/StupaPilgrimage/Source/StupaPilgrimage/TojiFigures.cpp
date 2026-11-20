#include "TojiFigures.h"

#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "EngineUtils.h"
#include "GameFramework/Actor.h"
#include "Materials/MaterialInstanceDynamic.h"

UStaticMeshComponent* TojiFigures::Part(AActor& Owner, USceneComponent& Parent, const TCHAR* Shape,
    const FVector& Position, const FVector& Size, const FLinearColor& Color, const FRotator& Rotation)
{
    UStaticMeshComponent* Part = NewObject<UStaticMeshComponent>(&Owner);
    Owner.AddInstanceComponent(Part);
    Part->SetupAttachment(&Parent);
    const FString MeshPath = FString::Printf(TEXT("/Engine/BasicShapes/%s.%s"), Shape, Shape);
    Part->SetStaticMesh(LoadObject<UStaticMesh>(nullptr, *MeshPath));
    if (UMaterialInterface* Material = Part->GetMaterial(0))
    {
        UMaterialInstanceDynamic* Tint = UMaterialInstanceDynamic::Create(Material, Part);
        Tint->SetVectorParameterValue(TEXT("Color"), Color);
        Part->SetMaterial(0, Tint);
    }
    Part->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Part->SetRelativeLocation(Position);
    Part->SetRelativeRotation(Rotation);
    Part->SetRelativeScale3D(Size / 100.0);
    Part->RegisterComponent();
    return Part;
}

namespace
{
struct FFigurePart
{
    const TCHAR* Tag;
    FVector Pivot;
};

// The Blender pivots are stored in meters, in lateral/forward/up order.
// Here the gameplay rig uses forward/lateral/up in centimeters.
const FFigurePart PilgrimParts[] = {
    {TEXT("Toji.Figure.PilgrimBody"), FVector::ZeroVector},
    {TEXT("Toji.Figure.PilgrimLeftLeg"), FVector(0, -12, 84)},
    {TEXT("Toji.Figure.PilgrimLeftSleeve"), FVector(0, -23, 135)},
    {TEXT("Toji.Figure.PilgrimRightLeg"), FVector(0, 12, 84)},
    {TEXT("Toji.Figure.PilgrimRightSleeve"), FVector(0, 23, 135)}
};
const FFigurePart KukaiPart[] = {
    {TEXT("Toji.Figure.Kukai"), FVector::ZeroVector}
};
}

void TojiFigures::Person(AActor& Owner, USceneComponent& Parent, bool bPilgrim,
    TArray<USceneComponent*>* Limbs)
{
    TMap<FName, const UStaticMeshComponent*> Sources;
    for (TActorIterator<AActor> It(Owner.GetWorld()); It; ++It)
    {
        for (const FName Tag : It->Tags)
        {
            if (Tag.ToString().StartsWith(TEXT("Toji.Figure.")))
            {
                Sources.Add(Tag, It->FindComponentByClass<UStaticMeshComponent>());
            }
        }
    }

    const TArrayView<const FFigurePart> Parts = bPilgrim
        ? MakeArrayView(PilgrimParts)
        : MakeArrayView(KukaiPart);
    for (const FFigurePart& Part : Parts)
    {
        const UStaticMeshComponent* Source = Sources.FindRef(FName(Part.Tag));
        if (!Source || !Source->GetStaticMesh())
        {
            UE_LOG(LogTemp, Error, TEXT("Missing generated Tō-ji figure part %s. Run the map generator."), Part.Tag);
            continue;
        }

        USceneComponent* Joint = &Parent;
        if (!Part.Pivot.IsZero())
        {
            Joint = NewObject<USceneComponent>(&Owner);
            Owner.AddInstanceComponent(Joint);
            Joint->SetupAttachment(&Parent);
            Joint->SetRelativeLocation(Part.Pivot);
            Joint->RegisterComponent();
            if (Limbs)
            {
                Limbs->Add(Joint);
            }
        }

        UStaticMeshComponent* Visual = NewObject<UStaticMeshComponent>(&Owner);
        Owner.AddInstanceComponent(Visual);
        Visual->SetupAttachment(Joint);
        Visual->SetStaticMesh(Source->GetStaticMesh());
        Visual->SetRelativeRotation(Source->GetComponentRotation());
        Visual->SetRelativeScale3D(Source->GetComponentScale());
        Visual->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        Visual->RegisterComponent();
    }
}
