#include "TojiFigures.h"

#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
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

void TojiFigures::Person(AActor& Owner, USceneComponent& Parent, bool bPilgrim,
    TArray<UStaticMeshComponent*>* Limbs)
{
    const FLinearColor Robe = bPilgrim ? FLinearColor(0.14f, 0.22f, 0.28f) : FLinearColor(0.18f, 0.048f, 0.023f);
    const FLinearColor Trim = bPilgrim ? FLinearColor(0.54f, 0.24f, 0.065f) : FLinearColor(0.75f, 0.36f, 0.07f);
    const FLinearColor Skin(0.63f, 0.33f, 0.18f);
    const FLinearColor Leather(0.13f, 0.073f, 0.04f);

    Part(Owner, Parent, TEXT("Cylinder"), FVector(0, 0, 74), FVector(42, 63, 52), Robe);
    Part(Owner, Parent, TEXT("Sphere"), FVector(0, 0, 115), FVector(40, 69, 70), Robe);
    Part(Owner, Parent, TEXT("Cylinder"), FVector(0, 0, 94), FVector(44, 63, 9), Trim);
    Part(Owner, Parent, TEXT("Sphere"), FVector(2, 0, 155), FVector(30, 31, 37), Skin);
    Part(Owner, Parent, TEXT("Sphere"), FVector(16, 0, 153), FVector(9, 9, 11), Skin);
    for (int Side : {-1, 1})
    {
        Part(Owner, Parent, TEXT("Sphere"), FVector(14, Side * 9, 157), FVector(4, 4, 4), Leather);
        UStaticMeshComponent* Leg = Part(Owner, Parent, TEXT("Cylinder"), FVector(0, Side * 16, 37),
            FVector(18, 19, 58), Robe);
        Part(Owner, *Leg, TEXT("Sphere"), FVector(34, 0, -48), FVector(190, 110, 32), Leather);
        UStaticMeshComponent* Sleeve = Part(Owner, Parent, TEXT("Sphere"), FVector(0, Side * 33, 113),
            FVector(25, 23, 60), Robe, FRotator(0, 0, Side * 9));
        Part(Owner, *Sleeve, TEXT("Sphere"), FVector(0, 0, -47), FVector(51, 50, 23), Skin);
        if (Limbs)
        {
            Limbs->Add(Leg);
            Limbs->Add(Sleeve);
        }
    }

    if (bPilgrim)
    {
        Part(Owner, Parent, TEXT("Cylinder"), FVector(0, 0, 174), FVector(78, 78, 5), Trim);
        Part(Owner, Parent, TEXT("Cone"), FVector(0, 0, 181), FVector(76, 76, 19), Trim);
        Part(Owner, Parent, TEXT("Sphere"), FVector(-21, 0, 114), FVector(21, 42, 57), Leather);
        Part(Owner, Parent, TEXT("Cylinder"), FVector(-28, 0, 132), FVector(19, 19, 48), Trim,
            FRotator(0, 0, 90));
    }
    else
    {
        Part(Owner, Parent, TEXT("Cube"), FVector(19, 0, 122), FVector(6, 13, 63), Trim,
            FRotator(0, 0, -28));
        Part(Owner, Parent, TEXT("Cylinder"), FVector(19, -49, 79), FVector(7, 7, 154), Leather);
        Part(Owner, Parent, TEXT("Sphere"), FVector(19, -49, 154), FVector(23, 23, 20), Trim);
        for (int Bead = -3; Bead <= 3; ++Bead)
        {
            Part(Owner, Parent, TEXT("Sphere"), FVector(19, Bead * 5, 129 + Bead * Bead),
                FVector(6, 6, 6), Leather);
        }
    }
}
